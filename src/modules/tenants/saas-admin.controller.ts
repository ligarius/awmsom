import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformGuard } from '../../guards/platform.guard';
import { MonitoringService } from '../monitoring/monitoring.service';

@UseGuards(PlatformGuard)
@Controller('saas')
export class SaasAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get('overview')
  async overview() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalTenants, activeTenants, suspendedTenants, planGroups] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.tenant.count({ where: { isActive: false } }),
      this.prisma.tenant.groupBy({
        by: ['planCode'],
        _count: { _all: true },
      }),
    ]);

    const [users, warehouses, apiKeys, integrations, monthlyOrders, monthlyShipments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.warehouse.count(),
      this.prisma.apiKey.count(),
      this.prisma.integrationConfig.count(),
      this.prisma.outboundOrder.count({ where: { createdAt: { gte: periodStart, lt: periodEnd } } }),
      this.prisma.shipment.count({ where: { createdAt: { gte: periodStart, lt: periodEnd } } }),
    ]);

    const alerts = this.monitoringService.getAlertsOverview();
    const errorSignals = this.monitoringService.getSignals({ level: 'error' });
    const errorLogs = Array.isArray(errorSignals?.logs) ? errorSignals.logs : [];

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        plans: planGroups.map((plan) => ({
          code: plan.planCode ?? 'UNASSIGNED',
          count: plan._count._all,
        })),
      },
      usage: {
        users,
        warehouses,
        apiKeys,
        integrations,
        monthlyOrders,
        monthlyShipments,
      },
      alerts,
      errors: {
        total: errorLogs.length,
        recent: errorLogs.slice(-6).reverse(),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
