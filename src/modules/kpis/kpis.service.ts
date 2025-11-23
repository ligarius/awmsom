import { Injectable } from '@nestjs/common';
import { OutboundOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiQueryDto } from './dto/kpi-query.dto';

@Injectable()
export class KpisService {
  constructor(private readonly prisma: PrismaService) {}

  private buildShiftWindow(dto: KpiQueryDto) {
    if (!dto.shiftStart || !dto.shiftEnd) {
      return undefined as
        | { startMinutes: number; endMinutes: number; durationHours: number }
        | undefined;
    }
    const [startHour, startMinute = 0] = dto.shiftStart.split(':').map(Number);
    const [endHour, endMinute = 0] = dto.shiftEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
    return {
      startMinutes,
      endMinutes,
      durationHours: durationMinutes / 60,
    };
  }

  private isWithinShift(date: Date | null | undefined, shiftWindow?: { startMinutes: number; endMinutes: number }) {
    if (!date || !shiftWindow) return true;
    const minutes = date.getHours() * 60 + date.getMinutes();
    if (shiftWindow.startMinutes <= shiftWindow.endMinutes) {
      return minutes >= shiftWindow.startMinutes && minutes <= shiftWindow.endMinutes;
    }
    return minutes >= shiftWindow.startMinutes || minutes <= shiftWindow.endMinutes;
  }

  private buildDateRange(dto: KpiQueryDto) {
    return { gte: new Date(dto.fromDate), lte: new Date(dto.toDate) };
  }

  async getSummary(tenantId: string, dto: KpiQueryDto) {
    const dateRange = this.buildDateRange(dto);
    const shiftWindow = this.buildShiftWindow(dto);

    const outboundFilter: Prisma.OutboundOrderWhereInput = {
      tenantId,
      requestedShipDate: dateRange,
      ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
      ...(dto.customerId ? { customerId: dto.customerId } : {}),
      lines: dto.productId ? { some: { productId: dto.productId } } : undefined,
      status: { in: [OutboundOrderStatus.PICKED, OutboundOrderStatus.PARTIALLY_PICKED, OutboundOrderStatus.FULLY_ALLOCATED] },
    } as Prisma.OutboundOrderWhereInput;

    const outboundLines = await this.prisma.outboundOrderLine.findMany({
      where: {
        tenantId,
        productId: dto.productId ? dto.productId : undefined,
        outboundOrder: outboundFilter,
      },
      include: { outboundOrder: true },
    });

    const requestedTotal = outboundLines.reduce((acc, line) => acc + Number(line.requestedQty), 0);
    const pickedTotal = outboundLines.reduce((acc, line) => acc + Number(line.pickedQty), 0);
    const fillRate = requestedTotal > 0 ? pickedTotal / requestedTotal : 0;

    const shipments = await this.prisma.shipment.findMany({
      where: {
        tenantId,
        actualDeparture: dateRange,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
      },
      include: {
        shipmentHandlingUnits: {
          include: { outboundOrder: { include: { lines: true } } },
        },
      },
    });

    let totalOrders = 0;
    let otifOrders = 0;

    shipments.forEach((shipment) => {
      shipment.shipmentHandlingUnits.forEach((shu) => {
        const order = shu.outboundOrder as any;
        if (dto.customerId && order.customerId !== dto.customerId) return;
        if (dto.productId && !order.lines.some((l: any) => l.productId === dto.productId)) return;
        totalOrders += 1;
        const requested = order.lines.reduce((acc: number, l: any) => acc + Number(l.requestedQty), 0);
        const picked = order.lines.reduce((acc: number, l: any) => acc + Number(l.pickedQty), 0);
        const onTime = shipment.actualDeparture && order.requestedShipDate ? shipment.actualDeparture <= order.requestedShipDate : false;
        const inFull = requested === picked;
        if (onTime && inFull) {
          otifOrders += 1;
        }
      });
    });

    const inventory = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        ...(dto.warehouseId ? { location: { warehouseId: dto.warehouseId } } : {}),
        ...(dto.productId ? { productId: dto.productId } : {}),
      },
    });
    const totalInventoryQty = inventory.reduce((acc, inv) => acc + Number(inv.quantity), 0);
    const averageInventoryQty = totalInventoryQty / 2 || 0;
    const inventoryTurnover = averageInventoryQty > 0 ? pickedTotal / averageInventoryQty : 0;

    const days = Math.max(1, (new Date(dto.toDate).getTime() - new Date(dto.fromDate).getTime()) / (1000 * 60 * 60 * 24));
    const consumptionPerDay = pickedTotal / days;
    const daysOfSupply = consumptionPerDay > 0 ? totalInventoryQty / consumptionPerDay : 0;

    const pickingTasks = await this.prisma.pickingTask.findMany({
      where: {
        tenantId,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.operatorId ? { pickerId: dto.operatorId } : {}),
        lines: dto.productId ? { some: { productId: dto.productId } } : undefined,
        completedAt: dateRange,
      },
      include: { lines: true },
    });

    const shiftFilteredTasks = pickingTasks.filter((task) =>
      this.isWithinShift(task.startedAt ?? task.completedAt, shiftWindow),
    );

    const totalPickingLines = shiftFilteredTasks.reduce((acc, task) => acc + task.lines.length, 0);
    const totalPickingUnits = shiftFilteredTasks.reduce(
      (acc, task) => acc + task.lines.reduce((sum, line) => sum + Number(line.quantityPicked), 0),
      0,
    );
    const totalPickingHours = shiftFilteredTasks.reduce((acc, task) => {
      if (!task.startedAt || !task.completedAt) return acc;
      return acc + (task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60);
    }, 0);
    const hours = totalPickingHours || 1;
    const linesPerHour = totalPickingLines / hours;
    const unitsPerHour = totalPickingUnits / hours;

    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: {
        tenantId,
        createdAt: dateRange,
        reason: { contains: 'picking error', mode: 'insensitive' },
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
      },
    });
    const pickingErrorLines = adjustments.length;
    const pickingAccuracy = totalPickingLines > 0 ? 1 - pickingErrorLines / totalPickingLines : 1;

    const totalLocations = await this.prisma.location.count({
      where: {
        tenantId,
        isActive: true,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        ...(dto.zone ? { zone: dto.zone } : {}),
      },
    });

    const occupiedLocations = await this.prisma.inventory.groupBy({
      by: ['locationId'],
      where: {
        tenantId,
        ...(dto.productId ? { productId: dto.productId } : {}),
        location: {
          ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
          ...(dto.zone ? { zone: dto.zone } : {}),
        },
      },
    });

    const spaceUtilization = totalLocations > 0 ? occupiedLocations.length / totalLocations : 0;

    const shiftHours = shiftWindow?.durationHours ?? 8;
    const operators = dto.operatorId ? 1 : Math.max(new Set(shiftFilteredTasks.map((task) => task.pickerId).filter(Boolean)).size, 1);
    const laborCapacityHours = shiftHours * operators;
    const laborUtilization = laborCapacityHours > 0 ? totalPickingHours / laborCapacityHours : 0;

    const workloadByOperator = shiftFilteredTasks.reduce((acc, task) => {
      const key = task.pickerId ?? 'unassigned';
      if (!acc[key]) {
        acc[key] = { operatorId: task.pickerId, tasks: 0, lines: 0, units: 0, hours: 0 };
      }
      acc[key].tasks += 1;
      acc[key].lines += task.lines.length;
      acc[key].units += task.lines.reduce((sum, line) => sum + Number(line.quantityPicked), 0);
      if (task.startedAt && task.completedAt) {
        acc[key].hours += (task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60);
      }
      return acc;
    }, {} as Record<string, { operatorId?: string | null; tasks: number; lines: number; units: number; hours: number }>);

    const throughputByWarehouse = shipments.reduce((acc, shipment) => {
      if (!acc[shipment.warehouseId]) {
        acc[shipment.warehouseId] = { warehouseId: shipment.warehouseId, shipments: 0, orders: 0, lines: 0, units: 0 };
      }
      acc[shipment.warehouseId].shipments += 1;
      shipment.shipmentHandlingUnits.forEach((shu) => {
        acc[shipment.warehouseId].orders += 1;
        const orderLines = shu.outboundOrder?.lines ?? [];
        acc[shipment.warehouseId].lines += orderLines.length;
        acc[shipment.warehouseId].units += orderLines.reduce((sum: number, line: any) => sum + Number(line.pickedQty ?? 0), 0);
      });
      return acc;
    }, {} as Record<string, { warehouseId: string; shipments: number; orders: number; lines: number; units: number }>);

    return {
      period: { from: new Date(dto.fromDate), to: new Date(dto.toDate) },
      scope: {
        warehouseId: dto.warehouseId,
        customerId: dto.customerId,
        productId: dto.productId,
        zone: dto.zone,
        operatorId: dto.operatorId,
        shiftStart: dto.shiftStart,
        shiftEnd: dto.shiftEnd,
      },
      service: {
        fillRate,
        otif: totalOrders > 0 ? otifOrders / totalOrders : 0,
        totalOrders,
        otifOrders,
      },
      capacity: {
        space: {
          utilization: spaceUtilization,
          occupiedLocations: occupiedLocations.length,
          totalLocations,
        },
        labor: {
          utilization: laborUtilization,
          capacityHours: laborCapacityHours,
          actualHours: totalPickingHours,
          operators,
          shiftHours,
        },
      },
      inventory: {
        inventoryTurnover,
        averageInventoryQty,
        daysOfSupply,
      },
      picking: {
        linesPerHour,
        unitsPerHour,
        pickingAccuracy,
        totalPickingLines,
        pickingErrorLines,
      },
      productivity: {
        workloadByOperator: Object.values(workloadByOperator),
        throughputByWarehouse: Object.values(throughputByWarehouse),
      },
    };
  }
}
