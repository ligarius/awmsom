import { Injectable, Logger } from '@nestjs/common';
import { KpiType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { KpisService } from '../kpis/kpis.service';
import { PaginationService } from '../../common/pagination/pagination.service';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kpisService: KpisService,
    private readonly pagination: PaginationService,
  ) {}

  async generateInventorySnapshotForTenant(tenantId: string, snapshotDate: Date) {
    const grouped = await this.prisma.inventory.groupBy({
      by: ['productId', 'batchId', 'locationId', 'uom'],
      where: { tenantId },
      _sum: { quantity: true },
    });

    const locationIds = Array.from(new Set(grouped.map((g) => g.locationId)));
    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, warehouseId: true },
    });
    const locationMap = locations.reduce<Record<string, string>>((acc, loc) => {
      acc[loc.id] = loc.warehouseId;
      return acc;
    }, {});

    const data = grouped.map((g) => ({
      id: randomUUID(),
      tenantId,
      snapshotDate,
      warehouseId: locationMap[g.locationId] || g.locationId,
      productId: g.productId,
      batchId: g.batchId,
      quantity: g._sum.quantity ?? new Prisma.Decimal(0),
      uom: g.uom,
    }));

    if (!data.length) {
      this.logger.log(`No inventory data to snapshot for tenant ${tenantId}`);
      return [];
    }

    await this.prisma.inventorySnapshot.createMany({ data, skipDuplicates: true });
    return data;
  }

  async generateKpiSnapshotForTenant(
    tenantId: string,
    kpiType: KpiType,
    periodStart: Date,
    periodEnd: Date,
    warehouseId?: string,
  ) {
    const summary = await this.kpisService.getSummary(tenantId, {
      fromDate: periodStart.toISOString(),
      toDate: periodEnd.toISOString(),
      warehouseId,
    } as any);

    const record = await this.prisma.kpiSnapshot.create({
      data: {
        tenantId,
        kpiType,
        periodStart,
        periodEnd,
        warehouseId,
        fillRate: new Prisma.Decimal(summary.service.fillRate ?? 0),
        otif: new Prisma.Decimal(summary.service.otif ?? 0),
        inventoryTurnover: new Prisma.Decimal(summary.inventory.inventoryTurnover ?? 0),
        averageInventoryQty: new Prisma.Decimal(summary.inventory.averageInventoryQty ?? 0),
        daysOfSupply: new Prisma.Decimal(summary.inventory.daysOfSupply ?? 0),
        linesPerHour: new Prisma.Decimal(summary.picking.linesPerHour ?? 0),
        unitsPerHour: new Prisma.Decimal(summary.picking.unitsPerHour ?? 0),
        pickingAccuracy: new Prisma.Decimal(summary.picking.pickingAccuracy ?? 0),
      },
    });

    return record;
  }

  async listInventorySnapshots(
    tenantId: string,
    query: { snapshotDate?: string; warehouseId?: string; productId?: string; batchId?: string; page?: number; limit?: number },
  ) {
    const { skip, take } = this.pagination.buildPaginationParams(query.page, query.limit);
    return this.prisma.inventorySnapshot.findMany({
      where: {
        tenantId,
        snapshotDate: query.snapshotDate ? new Date(query.snapshotDate) : undefined,
        warehouseId: query.warehouseId,
        productId: query.productId,
        batchId: query.batchId,
      },
      orderBy: { snapshotDate: 'desc' },
      skip,
      take,
    });
  }

  async listKpiSnapshots(
    tenantId: string,
    query: { kpiType?: KpiType; fromDate?: string; toDate?: string; warehouseId?: string; page?: number; limit?: number },
  ) {
    const { skip, take } = this.pagination.buildPaginationParams(query.page, query.limit);
    return this.prisma.kpiSnapshot.findMany({
      where: {
        tenantId,
        kpiType: query.kpiType,
        periodStart: query.fromDate ? { gte: new Date(query.fromDate) } : undefined,
        periodEnd: query.toDate ? { lte: new Date(query.toDate) } : undefined,
        warehouseId: query.warehouseId,
      },
      orderBy: { periodStart: 'desc' },
      skip,
      take,
    });
  }
}
