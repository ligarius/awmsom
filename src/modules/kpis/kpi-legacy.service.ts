import { Injectable } from '@nestjs/common';
import { MovementType, OutboundOrderStatus, PickingTaskStatus, ReplenishmentStatus, WaveStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KpisService } from './kpis.service';

@Injectable()
export class KpiLegacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpisService: KpisService,
  ) {}

  private buildRange(days = 14) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    return {
      from,
      to,
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
    };
  }

  async getExecutive(tenantId: string) {
    const range = this.buildRange(14);
    const summary = await this.kpisService.getSummary(tenantId, {
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    const inventoryAgg = await this.prisma.inventory.aggregate({
      where: { tenantId },
      _sum: { quantity: true },
    });
    const inventoryUnits = Number(inventoryAgg._sum.quantity ?? 0);

    const rotationBySku = await this.getTopSkuRotation(tenantId, 5);
    const topConsumption = rotationBySku.map((item) => ({ sku: item.sku, units: item.turns }));
    const topCritical = await this.getLowStockSkus(tenantId, 5);

    const demandByDay = await this.getDemandByDay(tenantId, range.from, range.to, 7);
    const heatmap = await this.getPickingHeatmap(tenantId, range.from, range.to, 12);

    return {
      otif: summary.service.otif,
      fillRate: summary.service.fillRate,
      serviceLevel: summary.picking.pickingAccuracy,
      inventoryUnits,
      inventoryValue: inventoryUnits,
      abc: this.buildAbc(rotationBySku.length),
      rotationBySku,
      demandByDay,
      heatmap,
      topConsumption,
      topCritical,
    };
  }

  async getOperations(tenantId: string) {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [inboundToday, releasedOrders, pickingOrders, completedOrders, activeWaves, replenishmentsPending] =
      await Promise.all([
        this.prisma.inboundReceipt.count({
          where: { tenantId, createdAt: { gte: dayStart } },
        }),
        this.prisma.outboundOrder.count({
          where: {
            tenantId,
            status: { in: [OutboundOrderStatus.RELEASED, OutboundOrderStatus.FULLY_ALLOCATED] },
          },
        }),
        this.prisma.outboundOrder.count({
          where: {
            tenantId,
            status: { in: [OutboundOrderStatus.PICKING, OutboundOrderStatus.PARTIALLY_PICKED] },
          },
        }),
        this.prisma.outboundOrder.count({
          where: {
            tenantId,
            status: OutboundOrderStatus.PICKED,
          },
        }),
        this.prisma.wave.count({
          where: { tenantId, status: { in: [WaveStatus.RELEASED, WaveStatus.IN_PROGRESS] } },
        }),
        this.prisma.replenishmentSuggestion.count({
          where: { tenantId, status: ReplenishmentStatus.PENDING },
        }),
      ]);

    const pickingPerformance = await this.getPickingPerformance(tenantId, 8);
    const movementsByType = await this.getMovementByType(tenantId);

    return {
      inboundToday,
      releasedOrders,
      pickingOrders,
      completedOrders,
      activeWaves,
      replenishmentsPending,
      pickingPerformance,
      movementsByType,
    };
  }

  async getInventory(tenantId: string) {
    const [activeSkus, totalStockAgg, availableAgg, committedAgg, damagedAgg] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.inventory.aggregate({ where: { tenantId }, _sum: { quantity: true } }),
      this.prisma.inventory.aggregate({
        where: { tenantId, stockStatus: 'AVAILABLE' },
        _sum: { quantity: true },
      }),
      this.prisma.inventory.aggregate({
        where: { tenantId, stockStatus: { in: ['RESERVED', 'PICKING', 'IN_TRANSIT_INTERNAL'] } },
        _sum: { quantity: true },
      }),
      this.prisma.inventory.aggregate({
        where: { tenantId, stockStatus: { in: ['QUARANTINE', 'SCRAP', 'BLOCKED'] } },
        _sum: { quantity: true },
      }),
    ]);

    const totalStock = Number(totalStockAgg._sum.quantity ?? 0);
    const availableStock = Number(availableAgg._sum.quantity ?? 0);
    const committedStock = Number(committedAgg._sum.quantity ?? 0);
    const damagedStock = Number(damagedAgg._sum.quantity ?? 0);

    const zones = await this.getZoneUtilization(tenantId);
    const abcRotation = await this.getAbcRotation(tenantId, 6);
    const topLocations = await this.getTopLocations(tenantId, 6);

    return {
      activeSkus,
      totalStock,
      availableStock,
      committedStock,
      damagedStock,
      zones,
      abcRotation,
      topLocations,
    };
  }

  async getPerformance(tenantId: string) {
    const range = this.buildRange(7);
    const tasks = await this.prisma.pickingTask.findMany({
      where: {
        tenantId,
        completedAt: { gte: range.from, lte: range.to },
        status: PickingTaskStatus.COMPLETED,
      },
      include: { lines: true },
    });

    const totals = new Map<
      string,
      { user: string; tasks: number; lines: number; hours: number }
    >();

    let totalLines = 0;
    let totalHours = 0;

    tasks.forEach((task) => {
      const key = task.pickerId ?? 'unassigned';
      const entry =
        totals.get(key) ?? { user: task.pickerId ?? 'Sin asignar', tasks: 0, lines: 0, hours: 0 };
      entry.tasks += 1;
      entry.lines += task.lines.length;
      if (task.startedAt && task.completedAt) {
        entry.hours += (task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60);
      }
      totals.set(key, entry);
      totalLines += task.lines.length;
      if (task.startedAt && task.completedAt) {
        totalHours += (task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60);
      }
    });

    const productivity = Array.from(totals.values()).map((entry) => ({
      user: entry.user,
      linesPerHour: entry.hours > 0 ? entry.lines / entry.hours : 0,
      tasksPerHour: entry.hours > 0 ? entry.tasks / entry.hours : 0,
    }));

    const avgPickSeconds = totalLines > 0 && totalHours > 0 ? (totalHours * 3600) / totalLines : 0;

    const errorAdjustments = await this.prisma.inventoryAdjustment.findMany({
      where: { tenantId, reason: { contains: 'error', mode: 'insensitive' } },
    });

    const errors = errorAdjustments.length
      ? [{ type: 'Picking error', count: errorAdjustments.length }]
      : [{ type: 'Sin errores', count: 0 }];

    return {
      productivity,
      times: { pick: Math.round(avgPickSeconds), handover: 0, packing: 0 },
      errors,
    };
  }

  private async getTopSkuRotation(tenantId: string, limit: number) {
    const aggregates = await this.prisma.outboundOrderLine.groupBy({
      by: ['productId'],
      where: { tenantId },
      _sum: { requestedQty: true },
      orderBy: { _sum: { requestedQty: 'desc' } },
      take: limit,
    });

    if (!aggregates.length) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: aggregates.map((item) => item.productId) } },
      select: { id: true, sku: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product.sku]));

    return aggregates.map((item) => ({
      sku: productMap.get(item.productId) ?? item.productId,
      turns: Number(item._sum.requestedQty ?? 0),
    }));
  }

  private async getLowStockSkus(tenantId: string, limit: number) {
    const aggregates = await this.prisma.inventory.groupBy({
      by: ['productId'],
      where: { tenantId },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'asc' } },
      take: limit,
    });

    if (!aggregates.length) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: aggregates.map((item) => item.productId) } },
      select: { id: true, sku: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product.sku]));

    return aggregates.map((item) => ({
      sku: productMap.get(item.productId) ?? item.productId,
      stock: Number(item._sum.quantity ?? 0),
    }));
  }

  private async getDemandByDay(tenantId: string, from: Date, to: Date, days: number) {
    const orders = await this.prisma.outboundOrder.findMany({
      where: {
        tenantId,
        requestedShipDate: { gte: from, lte: to },
      },
      select: { requestedShipDate: true },
    });

    const byDay = new Map<string, number>();
    orders.forEach((order) => {
      if (!order.requestedShipDate) return;
      const key = order.requestedShipDate.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    });

    const result: { date: string; units: number }[] = [];
    const cursor = new Date(to);
    for (let i = 0; i < days; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      result.unshift({ date: key, units: byDay.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() - 1);
    }

    return result;
  }

  private async getPickingHeatmap(tenantId: string, from: Date, to: Date, buckets: number) {
    const tasks = await this.prisma.pickingTask.findMany({
      where: {
        tenantId,
        completedAt: { gte: from, lte: to },
        status: PickingTaskStatus.COMPLETED,
      },
      select: { completedAt: true },
    });

    const counts = new Array(24).fill(0);
    tasks.forEach((task) => {
      if (!task.completedAt) return;
      counts[task.completedAt.getHours()] += 1;
    });

    const max = Math.max(...counts, 1);
    const step = Math.floor(24 / buckets);
    const result: { hour: number; value: number }[] = [];
    for (let i = 0; i < buckets; i += 1) {
      const hour = i * step;
      const bucketValue = counts.slice(hour, hour + step).reduce((acc, value) => acc + value, 0);
      result.push({ hour, value: max > 0 ? bucketValue / max : 0 });
    }

    return result;
  }

  private async getPickingPerformance(tenantId: string, hours: number) {
    const to = new Date();
    const from = new Date();
    from.setHours(to.getHours() - hours);

    const tasks = await this.prisma.pickingTask.findMany({
      where: {
        tenantId,
        completedAt: { gte: from, lte: to },
        status: PickingTaskStatus.COMPLETED,
      },
      include: { lines: true },
    });

    const byHour = new Map<number, number>();
    tasks.forEach((task) => {
      if (!task.completedAt) return;
      const hour = task.completedAt.getHours();
      byHour.set(hour, (byHour.get(hour) ?? 0) + task.lines.length);
    });

    const result: { hour: string; lines: number }[] = [];
    for (let i = 0; i < hours; i += 1) {
      const hour = (from.getHours() + i) % 24;
      result.push({ hour: `${hour.toString().padStart(2, '0')}:00`, lines: byHour.get(hour) ?? 0 });
    }

    return result;
  }

  private async getMovementByType(tenantId: string) {
    const movements = await this.prisma.movementHeader.groupBy({
      by: ['movementType'],
      where: { tenantId },
      _count: { _all: true },
    });

    const mapType = (type: string) => {
      if (type === MovementType.INBOUND_RECEIPT) return 'inbound';
      if (type === MovementType.OUTBOUND_SHIPMENT) return 'outbound';
      return 'adjustment';
    };

    return movements.map((item) => ({
      type: mapType(item.movementType),
      count: item._count._all,
    }));
  }

  private async getZoneUtilization(tenantId: string) {
    const locations = await this.prisma.location.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, zone: true },
    });
    if (!locations.length) {
      return [];
    }

    const inventory = await this.prisma.inventory.groupBy({
      by: ['locationId'],
      where: { tenantId },
      _sum: { quantity: true },
    });

    const inventoryMap = new Map(inventory.map((row) => [row.locationId, Number(row._sum.quantity ?? 0)]));
    const zones = new Map<string, { total: number; occupied: number }>();

    locations.forEach((location) => {
      const entry = zones.get(location.zone) ?? { total: 0, occupied: 0 };
      entry.total += 1;
      if ((inventoryMap.get(location.id) ?? 0) > 0) {
        entry.occupied += 1;
      }
      zones.set(location.zone, entry);
    });

    return Array.from(zones.entries()).map(([zone, data]) => ({
      label: zone,
      utilization: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
    }));
  }

  private async getAbcRotation(tenantId: string, limit: number) {
    const rotation = await this.getTopSkuRotation(tenantId, limit);
    return rotation.map((item, index) => ({
      sku: item.sku,
      category: index < 2 ? 'A' : index < 4 ? 'B' : 'C',
      turns: item.turns,
    }));
  }

  private async getTopLocations(tenantId: string, limit: number) {
    const aggregates = await this.prisma.inventory.groupBy({
      by: ['locationId'],
      where: { tenantId },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (!aggregates.length) {
      return [];
    }

    const locations = await this.prisma.location.findMany({
      where: { id: { in: aggregates.map((row) => row.locationId) } },
      select: { id: true, code: true },
    });
    const locationMap = new Map(locations.map((loc) => [loc.id, loc.code]));

    return aggregates.map((row) => ({
      location: locationMap.get(row.locationId) ?? row.locationId,
      occupancy: Math.round(Number(row._sum.quantity ?? 0)),
    }));
  }

  private buildAbc(count: number) {
    if (!count) {
      return { a: 0, b: 0, c: 0 };
    }
    return { a: 0.5, b: 0.3, c: 0.2 };
  }
}
