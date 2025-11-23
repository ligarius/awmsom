import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlanCode, SubscriptionPlan, UsageMetric } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type UsageMetricKey =
  | 'warehouses'
  | 'users'
  | 'apiKeys'
  | 'monthlyOrders'
  | 'monthlyShipments'
  | 'integrations';

type PlanLimitKey = keyof Pick<
  SubscriptionPlan,
  | 'maxWarehouses'
  | 'maxUsers'
  | 'maxApiKeys'
  | 'maxMonthlyOrders'
  | 'maxMonthlyShipments'
  | 'maxIntegrations'
>;

const metricToPlanKey: Record<UsageMetricKey, PlanLimitKey> = {
  warehouses: 'maxWarehouses',
  users: 'maxUsers',
  apiKeys: 'maxApiKeys',
  monthlyOrders: 'maxMonthlyOrders',
  monthlyShipments: 'maxMonthlyShipments',
  integrations: 'maxIntegrations',
};

const metricToUsageField: Record<UsageMetricKey, keyof UsageMetric> = {
  warehouses: 'warehousesCount',
  users: 'usersCount',
  apiKeys: 'apiKeysCount',
  monthlyOrders: 'monthlyOrdersCount',
  monthlyShipments: 'monthlyShipmentsCount',
  integrations: 'integrationsCount',
};

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private currentPeriod() {
    const now = new Date();
    return {
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  private async resolvePlanForTenant(tenantId: string): Promise<SubscriptionPlan | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { subscriptionPlan: true } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (tenant.subscriptionPlan) {
      return tenant.subscriptionPlan;
    }
    if (tenant.planCode) {
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code: tenant.planCode } });
      if (plan) return plan;
    }
    if (tenant.plan) {
      const code = tenant.plan as PlanCode;
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code } });
      return plan;
    }
    return null;
  }

  async ensureCurrentUsage(tenantId: string): Promise<UsageMetric> {
    const { periodStart, periodEnd } = this.currentPeriod();
    const existing = await this.prisma.usageMetric.findFirst({
      where: { tenantId, periodStart, periodEnd },
    });
    if (existing) {
      return existing;
    }

    const [warehousesCount, usersCount, apiKeysCount, integrationsCount, monthlyOrdersCount, monthlyShipmentsCount] =
      await Promise.all([
        this.prisma.warehouse.count({ where: { tenantId } }),
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.apiKey.count({ where: { tenantId } }),
        this.prisma.integrationConfig.count({ where: { tenantId } }),
        this.prisma.outboundOrder.count({ where: { tenantId, createdAt: { gte: periodStart, lt: periodEnd } } }),
        this.prisma.shipment.count({ where: { tenantId, createdAt: { gte: periodStart, lt: periodEnd } } }),
      ]);

    return this.prisma.usageMetric.create({
      data: {
        tenantId,
        periodStart,
        periodEnd,
        warehousesCount,
        usersCount,
        apiKeysCount,
        integrationsCount,
        monthlyOrdersCount,
        monthlyShipmentsCount,
      },
    });
  }

  async getUsageSnapshot(tenantId: string) {
    const usage = await this.ensureCurrentUsage(tenantId);
    const plan = await this.resolvePlanForTenant(tenantId);
    return { usage, plan };
  }

  async incrementUsage(tenantId: string, metric: UsageMetricKey, increment = 1) {
    const { periodStart, periodEnd } = this.currentPeriod();
    await this.ensureCurrentUsage(tenantId);

    return this.prisma.usageMetric.updateMany({
      where: { tenantId, periodStart, periodEnd },
      data: { [metricToUsageField[metric]]: { increment } },
    });
  }

  async checkLimit(tenantId: string, metric: UsageMetricKey, increment = 1) {
    const { usage, plan } = await this.getUsageSnapshot(tenantId);
    const planLimitKey = metricToPlanKey[metric];
    const limitValue = plan?.[planLimitKey];
    const currentValue = usage[metricToUsageField[metric]] as number;

    if (limitValue !== null && limitValue !== undefined && currentValue + increment > limitValue) {
      throw new ForbiddenException(`Plan limit reached for ${metric}`);
    }

    return { allowed: true, currentValue, limitValue };
  }
}
