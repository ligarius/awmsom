import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OutboundOrder,
  OutboundOrderStatus,
  PickingTaskStatus,
  Prisma,
  StockStatus,
  WavePickingStrategy,
  WaveStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../../common/cache/cache.service';
import { GenerateWavesDto } from './dto/generate-waves.dto';

interface WaveListFilters {
  warehouseId?: string;
  status?: string;
  pickerUserId?: string;
  timeWindowFrom?: string;
  timeWindowTo?: string;
}

@Injectable()
export class WavesService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService, private readonly cache: CacheService) {}

  private buildGroupingKey(strategy: WavePickingStrategy, order: OutboundOrder): string {
    switch (strategy) {
      case WavePickingStrategy.BY_ROUTE:
        return order.routeCode ?? 'UNASSIGNED';
      case WavePickingStrategy.BY_CARRIER:
        return order.carrierCode ?? 'UNASSIGNED';
      case WavePickingStrategy.BY_ZONE:
        return order.zoneCode ?? 'UNASSIGNED';
      case WavePickingStrategy.BY_TIMEWINDOW:
        return order.requestedShipDate?.toISOString().slice(0, 13) ?? 'NO_WINDOW';
      case WavePickingStrategy.BY_PRIORITY:
        return String(order.priority ?? 0);
      default:
        return 'DEFAULT';
    }
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  async generateWaves(tenantId: string, dto: GenerateWavesDto) {
    const where: Prisma.OutboundOrderWhereInput = {
      tenantId,
      warehouseId: dto.warehouseId,
      status: { in: [OutboundOrderStatus.FULLY_ALLOCATED, OutboundOrderStatus.RELEASED, OutboundOrderStatus.PARTIALLY_ALLOCATED] },
    } as any;

    if (dto.timeWindowFrom || dto.timeWindowTo) {
      where.requestedShipDate = {} as any;
      if (dto.timeWindowFrom) (where.requestedShipDate as any).gte = new Date(dto.timeWindowFrom);
      if (dto.timeWindowTo) (where.requestedShipDate as any).lte = new Date(dto.timeWindowTo);
    }

    if (dto.carrierCode) where.carrierCode = dto.carrierCode;
    if (dto.routeCode) where.routeCode = dto.routeCode;
    if (dto.zoneCode) where.zoneCode = dto.zoneCode;
    if (dto.priorityMin !== undefined) where.priority = { gte: dto.priorityMin } as any;

    const orders = await this.prisma.outboundOrder.findMany({
      where,
      include: { lines: true },
    });

    const grouped = orders.reduce<Record<string, OutboundOrder[]>>((acc, order) => {
      const key = this.buildGroupingKey(dto.strategy, order);
      acc[key] = acc[key] || [];
      acc[key].push(order);
      return acc;
    }, {});

    const createdWaves: any[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const groupOrders of Object.values(grouped)) {
        const batches = this.chunkArray(groupOrders, dto.maxOrdersPerWave ?? groupOrders.length);
        for (const batch of batches) {
          if (!batch.length) continue;
          const sample = batch[0];
          const wave = await tx.wave.create({
            data: {
              tenantId,
              warehouseId: dto.warehouseId,
              strategy: dto.strategy,
              routeCode: dto.strategy === WavePickingStrategy.BY_ROUTE ? sample.routeCode : dto.routeCode,
              carrierCode: dto.strategy === WavePickingStrategy.BY_CARRIER ? sample.carrierCode : dto.carrierCode,
              zoneCode: dto.strategy === WavePickingStrategy.BY_ZONE ? sample.zoneCode : dto.zoneCode,
              timeWindowFrom: dto.timeWindowFrom ? new Date(dto.timeWindowFrom) : sample.requestedShipDate,
              timeWindowTo: dto.timeWindowTo ? new Date(dto.timeWindowTo) : undefined,
            },
          });

          await tx.waveOrder.createMany({
            data: batch.map((order) => ({ tenantId, waveId: wave.id, outboundOrderId: order.id })),
          });

          const totals = batch.reduce(
            (acc, order) => {
              acc.orders += 1;
              acc.lines += order.lines.length;
              acc.units += order.lines.reduce((sum, line) => sum + Number(line.requestedQty ?? 0), 0);
              return acc;
            },
            { orders: 0, lines: 0, units: 0 },
          );

          const updated = await tx.wave.update({
            where: { id: wave.id },
            data: { totalOrders: totals.orders, totalLines: totals.lines, totalUnits: totals.units },
          });
          createdWaves.push(updated);
        }
      }
    });

    await this.auditService.recordLog({
      tenantId,
      resource: 'WAVE_PICKING',
      action: 'GENERATE',
      metadata: { strategy: dto.strategy, warehouseId: dto.warehouseId, totalWaves: createdWaves.length },
    });

    return createdWaves;
  }

  async releaseWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.update({
      where: { id: waveId, tenantId } as any,
      data: { status: WaveStatus.RELEASED, releasedAt: new Date() },
    });
    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'RELEASE', entityId: waveId });
    return wave;
  }

  async startWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.update({
      where: { id: waveId, tenantId } as any,
      data: { status: WaveStatus.IN_PROGRESS, startedAt: new Date() },
    });
    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'START', entityId: waveId });
    return wave;
  }

  async completeWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.update({
      where: { id: waveId, tenantId } as any,
      data: { status: WaveStatus.COMPLETED, completedAt: new Date() },
    });
    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'COMPLETE', entityId: waveId });
    return wave;
  }

  async cancelWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.update({
      where: { id: waveId, tenantId } as any,
      data: { status: WaveStatus.CANCELLED, cancelledAt: new Date() },
    });
    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'CANCEL', entityId: waveId });
    return wave;
  }

  async assignWave(tenantId: string, waveId: string, pickerUserId: string) {
    const wave = await this.prisma.wave.update({
      where: { id: waveId, tenantId } as any,
      data: { pickerUserId },
    });
    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'ASSIGN', entityId: waveId, metadata: { pickerUserId } });
    return wave;
  }

  async listWaves(tenantId: string, filters: WaveListFilters) {
    const where: Prisma.WaveWhereInput = { tenantId } as any;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status as WaveStatus;
    if (filters.pickerUserId) where.pickerUserId = filters.pickerUserId;
    if (filters.timeWindowFrom || filters.timeWindowTo) {
      where.timeWindowFrom = {} as any;
      if (filters.timeWindowFrom) (where.timeWindowFrom as any).gte = new Date(filters.timeWindowFrom);
      if (filters.timeWindowTo) (where.timeWindowFrom as any).lte = new Date(filters.timeWindowTo);
    }
    return this.prisma.wave.findMany({ where, include: { waveOrders: true, wavePickingPaths: true } });
  }

  async getWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.findFirst({
      where: { id: waveId, tenantId } as any,
      include: { waveOrders: { include: { outboundOrder: true } }, wavePickingPaths: true },
    });
    if (!wave) throw new NotFoundException('Wave not found');
    return wave;
  }

  async createPickingTasksForWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.findFirst({
      where: { id: waveId, tenantId } as any,
      include: { waveOrders: { include: { outboundOrder: { include: { lines: true } } } } },
    });

    if (!wave) throw new NotFoundException('Wave not found');

    const pickingTasks = await this.prisma.$transaction(async (tx) => {
      const tasksCreated = [] as any[];
      const task = await tx.pickingTask.create({
        data: {
          tenantId,
          warehouseId: wave.warehouseId,
          waveId: wave.id,
          outboundOrderId: wave.waveOrders[0]?.outboundOrderId,
          status: wave.pickerUserId ? PickingTaskStatus.ASSIGNED : PickingTaskStatus.CREATED,
          pickerId: wave.pickerUserId ?? undefined,
        } as any,
      });

      const consolidated = new Map<string, { outboundOrderLineId: string; productId: string; batchId?: string; locationId: string; qty: number; uom: string }>();

      for (const waveOrder of wave.waveOrders) {
        const order = waveOrder.outboundOrder;
        for (const line of order.lines) {
          const reservations = await tx.inventory.findMany({
            where: {
              tenantId,
              productId: line.productId,
              warehouseId: wave.warehouseId,
              stockStatus: StockStatus.RESERVED,
            } as any,
            include: { batch: true },
          });

          for (const reservation of reservations) {
            const key = `${reservation.locationId}:${reservation.productId}:${reservation.batchId ?? 'none'}`;
            const qtyValue =
              typeof reservation.quantity === 'object' && reservation.quantity !== null && 'value' in reservation.quantity
                ? Number((reservation.quantity as any).value)
                : Number(reservation.quantity ?? 0);
            const existing = consolidated.get(key);
            if (existing) {
              existing.qty += qtyValue;
            } else {
              consolidated.set(key, {
                outboundOrderLineId: line.id,
                productId: reservation.productId,
                batchId: reservation.batchId ?? undefined,
                locationId: reservation.locationId,
                qty: qtyValue,
                uom: reservation.uom,
              });
            }
          }
        }
      }

      for (const entry of consolidated.values()) {
        await tx.pickingTaskLine.create({
          data: {
            tenantId,
            pickingTaskId: task.id,
            outboundOrderLineId: entry.outboundOrderLineId,
            productId: entry.productId,
            batchId: entry.batchId,
            fromLocationId: entry.locationId,
            quantityToPick: new Prisma.Decimal(entry.qty),
            uom: entry.uom,
          } as any,
        });
      }

      tasksCreated.push(task);
      return tasksCreated;
    });

    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'CREATE_TASKS', entityId: waveId });
    return pickingTasks;
  }

  private getLocationCoordinates(location: any) {
    const toNumber = (value?: string | number | null) => (value === undefined || value === null ? 0 : Number(value));
    return {
      x: toNumber(location?.aisle),
      y: toNumber(location?.row),
      z: toNumber(location?.level ?? location?.column),
    };
  }

  private distance(a: any, b: any) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
  }

  private nearestNeighbor(nodes: any[], distanceFn: (a: any, b: any) => number) {
    if (!nodes.length) return [] as any[];
    const remaining = [...nodes];
    const route: any[] = [];
    let current = remaining.shift()!;
    route.push(current);
    while (remaining.length) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      remaining.forEach((node, idx) => {
        const d = distanceFn(current, node);
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = idx;
        }
      });
      current = remaining.splice(bestIndex, 1)[0];
      route.push(current);
    }
    return route;
  }

  async generatePickingPathForWave(tenantId: string, waveId: string) {
    const wave = await this.prisma.wave.findFirst({
      where: { id: waveId, tenantId } as any,
      include: { pickingTasks: { include: { lines: { include: { fromLocation: true } } } }, pickerUser: true },
    });
    if (!wave) throw new NotFoundException('Wave not found');

    const locationMap = new Map<string, { locationId: string; coords: any; lineIds: string[] }>();
    for (const task of wave.pickingTasks) {
      for (const line of task.lines) {
        const coords = this.getLocationCoordinates(line.fromLocation);
        const key = line.fromLocationId;
        if (!locationMap.has(key)) {
          locationMap.set(key, { locationId: line.fromLocationId, coords, lineIds: [] });
        }
        locationMap.get(key)!.lineIds.push(line.id);
      }
    }

    const startNode = { locationId: 'START', coords: { x: 0, y: 0, z: 0 }, lineIds: [] };
    const nodes = [startNode, ...Array.from(locationMap.values())];
    const cacheKey = this.cache.buildKey('route:distance-matrix', [tenantId, wave.warehouseId]);
    const distanceMatrix = (await this.cache.getJson<Record<string, number>>(cacheKey)) ?? {};
    const distanceFn = (a: any, b: any) => {
      const key = `${a.locationId}->${b.locationId}`;
      if (distanceMatrix[key] !== undefined) return distanceMatrix[key];
      const dist = this.distance(a.coords, b.coords);
      distanceMatrix[key] = dist;
      return dist;
    };

    const ordered = this.nearestNeighbor(nodes, distanceFn);

    let totalDistance = 0;
    const pathJson = ordered.map((node, idx) => {
      const prev = idx === 0 ? node : ordered[idx - 1];
      const dist = distanceFn(prev, node);
      totalDistance += dist;
      return {
        locationId: node.locationId,
        seq: idx,
        estDistance: dist,
        estTime: dist / 1.2 / 60,
        linesIds: node.lineIds ?? [],
      };
    });

    const totalTimeMinutes = totalDistance / 1.2 / 60;
    await this.cache.setJson(cacheKey, distanceMatrix, 3600);

    const path = await this.prisma.wavePickingPath.upsert({
      where: { waveId: wave.id },
      update: {
        pathJson,
        totalDistance: new Prisma.Decimal(totalDistance),
        totalTime: new Prisma.Decimal(totalTimeMinutes),
        pickerUserId: wave.pickerUserId,
      },
      create: {
        tenantId,
        waveId: wave.id,
        pathJson,
        totalDistance: new Prisma.Decimal(totalDistance),
        totalTime: new Prisma.Decimal(totalTimeMinutes),
        pickerUserId: wave.pickerUserId,
      },
    } as any);

    await this.auditService.recordLog({ tenantId, resource: 'WAVE_PICKING', action: 'GENERATE_PATH', entityId: waveId });
    return path;
  }
}
