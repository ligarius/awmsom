import { BadRequestException, Body, Controller, Get, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlanCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { UsersService } from '../users/users.service';
import { RbacService } from '../rbac/rbac.service';
import { PlatformGuard } from '../../guards/platform.guard';
import { CreateSaasTenantDto } from './dto/create-saas-tenant.dto';
import { CreateSaasTenantUserDto } from './dto/create-saas-tenant-user.dto';
import { UpdateSaasTenantDto } from './dto/update-saas-tenant.dto';
import { ROLE_TENANT_ADMIN } from '../../common/auth.constants';

@UseGuards(PlatformGuard)
@Controller('saas/tenants')
export class SaasTenantsController {
  private readonly logger = new Logger(SaasTenantsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboardingService: OnboardingService,
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageSize;

    const [total, tenants] = await this.prisma.$transaction([
      this.prisma.tenant.count(),
      this.prisma.tenant.findMany({
        include: { subscriptionPlan: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: tenants.map((tenant) => this.mapTenant(tenant)),
      total,
      page: pageNumber,
      pageSize,
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { subscriptionPlan: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    return this.mapTenant(tenant);
  }

  @Post()
  async create(@Body() dto: CreateSaasTenantDto) {
    const planCode = this.resolvePlanCode(dto.plan);
    const result = await this.onboardingService.registerTenant({
      companyName: dto.name,
      adminName: dto.adminName ?? dto.name,
      adminEmail: dto.email,
      adminPassword: dto.adminPassword,
      planCode,
      billingEmail: dto.billingEmail ?? dto.email,
    });

    this.logger.log(`Created tenant ${result.tenantId} for ${dto.name}`);

    return result;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSaasTenantDto) {
    const planCode = dto.plan ? this.resolvePlanCode(dto.plan) : undefined;
    const plan = planCode
      ? await this.prisma.subscriptionPlan.findUnique({ where: { code: planCode } })
      : null;

    const data: any = {};
    if (dto.name) {
      data.name = dto.name;
    }
    if (dto.email) {
      data.billingEmail = dto.email;
    }
    if (dto.billingEmail) {
      data.billingEmail = dto.billingEmail;
    }
    if (planCode) {
      data.plan = planCode;
      data.planCode = planCode;
      data.planId = plan?.id ?? null;
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data,
      include: { subscriptionPlan: true },
    });

    this.logger.log(`Updated tenant ${tenant.id} (${tenant.name})`);

    return this.mapTenant(tenant);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: true, subscriptionStatus: 'ACTIVE' },
      include: { subscriptionPlan: true },
    });
    this.logger.log(`Activated tenant ${tenant.id} (${tenant.name})`);
    return this.mapTenant(tenant);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false, subscriptionStatus: 'SUSPENDED' },
      include: { subscriptionPlan: true },
    });
    this.logger.log(`Suspended tenant ${tenant.id} (${tenant.name})`);
    return this.mapTenant(tenant);
  }

  @Get(':id/users')
  async listUsers(@Param('id') id: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId: id },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const primaryRole = user.userRoles[0]?.role?.name ?? 'UNASSIGNED';
      return {
        id: user.id,
        fullName: user.email,
        email: user.email,
        role: primaryRole,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        lastLogin: undefined,
      };
    });
  }

  @Post(':id/users')
  async createUser(@Param('id') id: string, @Body() dto: CreateSaasTenantUserDto) {
    const roleName = dto.role ?? ROLE_TENANT_ADMIN;
    const role = await this.prisma.role.findFirst({ where: { tenantId: id, name: roleName } });
    if (!role) {
      throw new BadRequestException(`Role ${roleName} not found for tenant`);
    }

    const user = await this.usersService.createUser(id, {
      email: dto.email,
      password: dto.password,
      isActive: true,
    });

    await this.rbacService.assignRoleToUser(id, { userId: user.id, roleId: role.id });

    return {
      id: user.id,
      fullName: dto.fullName ?? user.email,
      email: user.email,
      role: role.name,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: user.createdAt,
    };
  }

  private resolvePlanCode(plan?: string) {
    if (!plan) return PlanCode.BASIC;
    const normalized = plan.trim().toUpperCase();
    const aliases: Record<string, PlanCode> = {
      SILVER: PlanCode.BASIC,
      PLATA: PlanCode.BASIC,
      BASIC: PlanCode.BASIC,
      GOLD: PlanCode.PRO,
      ORO: PlanCode.PRO,
      PRO: PlanCode.PRO,
      DIAMANTE: PlanCode.ENTERPRISE,
      DIAMOND: PlanCode.ENTERPRISE,
      FULL: PlanCode.ENTERPRISE,
      ENTERPRISE: PlanCode.ENTERPRISE,
    };
    if (normalized in aliases) {
      return aliases[normalized];
    }
    if (normalized in PlanCode) {
      return PlanCode[normalized as keyof typeof PlanCode];
    }
    return PlanCode.BASIC;
  }

  private mapTenant(tenant: any) {
    const status = !tenant.isActive
      ? 'SUSPENDED'
      : tenant.subscriptionStatus && tenant.subscriptionStatus !== 'ACTIVE'
      ? 'EXPIRED'
      : 'ACTIVE';
    const plan = tenant.planCode ?? tenant.plan ?? 'BASIC';
    return {
      id: tenant.id,
      name: tenant.name,
      taxId: '',
      email: tenant.billingEmail ?? '',
      plan,
      userLimit: tenant.subscriptionPlan?.maxUsers ?? undefined,
      operationLimit: tenant.subscriptionPlan?.maxMonthlyOrders ?? undefined,
      status,
      createdAt: tenant.createdAt,
    };
  }
}
