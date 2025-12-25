import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PermissionAction, PermissionResource, PlanCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '../config/config.service';
import { RbacService } from '../rbac/rbac.service';
import { UserAccountService } from '../users/user-account.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { ROLE_OWNER, ROLE_PLATFORM_ADMIN, ROLE_TENANT_ADMIN, ROLE_TENANT_OPERATOR, ROLE_TENANT_SUPERVISOR } from '../../common/auth.constants';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
    private readonly userAccountService: UserAccountService,
  ) {}

  private getCurrentPeriod() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { periodStart, periodEnd };
  }

  private async generateTenantCode(baseName: string) {
    const base = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 20);
    let candidate = base || 'tenant';
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.tenant.findFirst({ where: { code: candidate } });
      if (!existing) {
        return candidate;
      }
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private async createFullAccessRole(tenantId: string, name: string, description: string) {
    const role = await this.rbacService.createRole(
      tenantId,
      { name, description, isSystem: true },
    );

    await this.prisma.rolePermission.createMany({
      data: Object.values(PermissionResource).flatMap((resource) =>
        Object.values(PermissionAction).map((action) => ({
          roleId: role.id,
          resource,
          action,
        })),
      ),
    });

    return role;
  }

  private async ensureStandardRoles(tenantId: string, includePlatformRoles: boolean) {
    const adminRole = await this.createFullAccessRole(
      tenantId,
      ROLE_TENANT_ADMIN,
      'Full access for tenant admins',
    );

    let ownerRole;
    let platformAdminRole;

    if (includePlatformRoles) {
      ownerRole = await this.createFullAccessRole(
        tenantId,
        ROLE_OWNER,
        'Platform owner with global access',
      );
      platformAdminRole = await this.createFullAccessRole(
        tenantId,
        ROLE_PLATFORM_ADMIN,
        'Platform administrator with global access',
      );
    }

    const supervisorRole = await this.rbacService.createRole(
      tenantId,
      { name: ROLE_TENANT_SUPERVISOR, description: 'Supervises operations', isSystem: true },
    );
    const operatorRole = await this.rbacService.createRole(
      tenantId,
      { name: ROLE_TENANT_OPERATOR, description: 'Operates daily tasks', isSystem: true },
    );

    await this.rbacService.setRolePermissions(tenantId, supervisorRole.id, {
      permissions: [
        { resource: PermissionResource.WAREHOUSE, action: PermissionAction.CREATE },
        { resource: PermissionResource.WAREHOUSE, action: PermissionAction.UPDATE },
        { resource: PermissionResource.WAREHOUSE, action: PermissionAction.READ },
        { resource: PermissionResource.PRODUCT, action: PermissionAction.CREATE },
        { resource: PermissionResource.PRODUCT, action: PermissionAction.UPDATE },
        { resource: PermissionResource.PRODUCT, action: PermissionAction.READ },
        { resource: PermissionResource.INBOUND, action: PermissionAction.CREATE },
        { resource: PermissionResource.INBOUND, action: PermissionAction.UPDATE },
        { resource: PermissionResource.INBOUND, action: PermissionAction.READ },
        { resource: PermissionResource.OUTBOUND, action: PermissionAction.CREATE },
        { resource: PermissionResource.OUTBOUND, action: PermissionAction.UPDATE },
        { resource: PermissionResource.OUTBOUND, action: PermissionAction.READ },
        { resource: PermissionResource.REPORTS, action: PermissionAction.READ },
      ],
    });

    await this.rbacService.setRolePermissions(tenantId, operatorRole.id, {
      permissions: [
        { resource: PermissionResource.INVENTORY, action: PermissionAction.READ },
        { resource: PermissionResource.INVENTORY, action: PermissionAction.UPDATE },
        { resource: PermissionResource.INBOUND, action: PermissionAction.CREATE },
        { resource: PermissionResource.INBOUND, action: PermissionAction.UPDATE },
        { resource: PermissionResource.OUTBOUND, action: PermissionAction.CREATE },
        { resource: PermissionResource.OUTBOUND, action: PermissionAction.UPDATE },
        { resource: PermissionResource.PICKING, action: PermissionAction.UPDATE },
      ],
    });

    return { adminRole, ownerRole, platformAdminRole };
  }

  async registerTenant(dto: RegisterTenantDto) {
    if (!dto.companyName || !dto.adminEmail || !dto.adminPassword) {
      throw new BadRequestException('companyName, adminEmail and adminPassword are required');
    }

    const isFirstTenant = (await this.prisma.tenant.count()) === 0;
    const planCode = dto.planCode ?? PlanCode.BASIC;
    const selectedPlan = await this.prisma.subscriptionPlan.findUnique({ where: { code: planCode } });

    const tenantCode = await this.generateTenantCode(dto.companyName);
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        code: tenantCode,
        plan: planCode,
        planCode,
        planId: selectedPlan?.id,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt,
        billingEmail: dto.billingEmail ?? dto.adminEmail,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    await this.configService.getTenantConfig(tenant.id);
    await this.configService.getMovementReasons(tenant.id);
    const { adminRole, ownerRole } = await this.ensureStandardRoles(tenant.id, isFirstTenant);

    const adminUser = await this.userAccountService.createUser({
      email: dto.adminEmail,
      password: dto.adminPassword,
      tenantId: tenant.id,
      isActive: true,
    });

    const roleToAssign = isFirstTenant && ownerRole ? ownerRole : adminRole;
    await this.rbacService.assignRoleToUser(tenant.id, { userId: adminUser.id, roleId: roleToAssign.id });

    const warehouseCode = 'DEFAULT';
    await this.prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        code: warehouseCode,
        name: dto.companyName ? `${dto.companyName} - Principal` : 'Default Warehouse',
      },
    });

    await this.prisma.usageMetric.create({
      data: {
        tenantId: tenant.id,
        periodStart,
        periodEnd,
        usersCount: 1,
        warehousesCount: 1,
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId: tenant.id,
        eventType: 'PLAN_ASSIGNED',
        amount: null,
        currency: null,
        metadata: { planCode },
      },
    });

    await this.auditService.recordLog({
      tenantId: tenant.id,
      resource: 'TENANT',
      action: 'REGISTER',
      entityId: tenant.id,
      userId: adminUser.id,
      metadata: { planCode, adminEmail: dto.adminEmail },
    });

    this.logger.log(`Tenant registered: ${tenant.id} (${tenant.name})`);

    return {
      tenantId: tenant.id,
      adminUserId: adminUser.id,
      planCode,
      adminEmail: dto.adminEmail,
      message: 'Tenant registered successfully',
    };
  }
}
