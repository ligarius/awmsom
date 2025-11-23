import { Injectable } from '@nestjs/common';
import { OutboundOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiQueryDto } from './dto/kpi-query.dto';

@Injectable()
export class KpisService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(dto: KpiQueryDto) {
    return { gte: new Date(dto.fromDate), lte: new Date(dto.toDate) };
  }

  async getSummary(tenantId: string, dto: KpiQueryDto) {
    const dateRange = this.buildDateRange(dto);

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
        shipmentHandlingUnits: dto.warehouseId
          ? { some: { shipment: { warehouseId: dto.warehouseId } } }
          : undefined,
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
        lines: dto.productId ? { some: { productId: dto.productId } } : undefined,
        completedAt: dateRange,
      },
      include: { lines: true },
    });

    const totalPickingLines = pickingTasks.reduce((acc, task) => acc + task.lines.length, 0);
    const totalPickingUnits = pickingTasks.reduce(
      (acc, task) => acc + task.lines.reduce((sum, line) => sum + Number(line.quantityPicked), 0),
      0,
    );
    const totalPickingHours = pickingTasks.reduce((acc, task) => {
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

    return {
      period: { from: new Date(dto.fromDate), to: new Date(dto.toDate) },
      scope: { warehouseId: dto.warehouseId, customerId: dto.customerId, productId: dto.productId },
      service: {
        fillRate,
        otif: totalOrders > 0 ? otifOrders / totalOrders : 0,
        totalOrders,
        otifOrders,
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
    };
  }
}
