import { BadRequestException, Injectable } from '@nestjs/common';
import { PermissionAction, PermissionResource, PlanCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '../config/config.service';
import { RbacService } from '../rbac/rbac.service';
import { UserAccountService } from '../users/user-account.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Injectable()
export class OnboardingService {

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

  private async ensureAdminRole(tenantId: string) {
    const adminRole = await this.rbacService.createRole(
      tenantId,
      { name: 'ADMIN', description: 'Full access', isSystem: true },
    );

    await this.prisma.rolePermission.createMany({
      data: Object.values(PermissionResource).flatMap((resource) =>
        Object.values(PermissionAction).map((action) => ({
          roleId: adminRole.id,
          resource,
          action,
        })),
      ),
    });

    const supervisorRole = await this.rbacService.createRole(
      tenantId,
      { name: 'SUPERVISOR', description: 'Supervises operations', isSystem: true },
    );
    const operatorRole = await this.rbacService.createRole(
      tenantId,
      { name: 'OPERATOR', description: 'Operates daily tasks', isSystem: true },
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

    return adminRole;
  }

  async registerTenant(dto: RegisterTenantDto) {
    if (!dto.companyName || !dto.adminEmail || !dto.adminPassword) {
      throw new BadRequestException('companyName, adminEmail and adminPassword are required');
    }

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
    const adminRole = await this.ensureAdminRole(tenant.id);

    const adminUser = await this.userAccountService.createUser({
      email: dto.adminEmail,
      password: dto.adminPassword,
      tenantId: tenant.id,
      isActive: true,
    });

    await this.rbacService.assignRoleToUser(tenant.id, { userId: adminUser.id, roleId: adminRole.id });

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

    return {
      tenantId: tenant.id,
      adminUserId: adminUser.id,
      planCode,
      adminEmail: dto.adminEmail,
      message: 'Tenant registered successfully',
    };
  }
}
