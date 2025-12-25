import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchTraceQueryDto } from './dto/batch-trace-query.dto';
import { CustomerTraceQueryDto } from './dto/customer-trace-query.dto';
import { ProductHistoryQueryDto } from './dto/product-history-query.dto';
import { CacheService } from '../../common/cache/cache.service';
import { PaginationService } from '../../common/pagination/pagination.service';

const TRACE_CACHE_TTL = parseInt(process.env.TRACE_CACHE_TTL ?? '120', 10);

@Injectable()
export class TraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly pagination: PaginationService,
  ) {}

  async getBatchTrace(tenantId: string, dto: BatchTraceQueryDto) {
    const cacheKey = this.cache.buildKey('trace:batch', [
      tenantId,
      dto.batchCode,
      dto.productId,
      dto.warehouseId,
      dto.page,
      dto.limit,
    ]);
    const cached = await this.cache.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const pagination = this.pagination.buildPaginationParams(dto.page, dto.limit);
    const batch = (await this.prisma.batch.findFirst({
      where: {
        tenantId,
        OR: [{ batchCode: dto.batchCode } as any, { code: dto.batchCode } as any] as any,
        ...(dto.productId ? { productId: dto.productId } : {}),
      } as Prisma.BatchWhereInput,
      include: { product: true } as any,
    })) as any;

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const inboundLines = await this.prisma.inboundReceiptLine.findMany({
      where: {
        tenantId,
        OR: [{ batchId: batch.id }, { batchCode: dto.batchCode }],
        ...(dto.productId ? { productId: dto.productId } : {}),
        inboundReceipt: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
      } as Prisma.InboundReceiptLineWhereInput,
      include: { inboundReceipt: true },
      orderBy: { createdAt: 'asc' },
      ...pagination,
    });

    const receipts = Object.values(
      inboundLines.reduce((acc: Record<string, any>, line) => {
        const receipt = line.inboundReceipt;
        if (!acc[receipt.id]) {
          acc[receipt.id] = {
            receiptId: receipt.id,
            receiptNumber: receipt.externalRef,
            date: receipt.receivedAt || receipt.createdAt,
            supplierRef: receipt.externalRef,
            warehouseId: receipt.warehouseId,
            lines: [],
          };
        }
        acc[receipt.id].lines.push({
          lineId: line.id,
          productId: line.productId,
          quantity: line.receivedQty,
          uom: line.uom,
          locationId: receipt.warehouseId,
        });
        return acc;
      }, {}),
    );

    const movementLines = await this.prisma.movementLine.findMany({
      where: {
        tenantId,
        batchId: batch.id,
        movementHeader: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
      },
      include: { movementHeader: true },
      orderBy: { createdAt: 'asc' },
      ...pagination,
    });

    const internalMovements = movementLines.map((line) => ({
      movementId: line.movementHeaderId,
      date: line.movementHeader.createdAt,
      fromLocationId: line.fromLocationId,
      toLocationId: line.toLocationId,
      quantity: line.quantity,
      uom: line.uom,
      warehouseId: line.movementHeader.warehouseId,
    }));

    const outboundLines = (await this.prisma.outboundOrderLine.findMany({
      where: {
        tenantId,
        productId: dto.productId ?? batch.productId,
        outboundOrder: dto.warehouseId ? { warehouseId: dto.warehouseId } : {},
        pickingTaskLines: { some: { batchId: batch.id } },
      },
      include: { outboundOrder: { include: { customer: true } }, pickingTaskLines: true } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    const outboundOrders = outboundLines.map((line: any) => ({
      outboundOrderId: line.outboundOrderId,
      externalRef: line.outboundOrder.externalRef,
      customerId: line.outboundOrder.customerId,
      customerName: line.outboundOrder.customer?.name,
      customerCode: line.outboundOrder.customer?.code,
      requestedShipDate: line.outboundOrder.requestedShipDate,
      lines: [
        {
          outboundOrderLineId: line.id,
          productId: line.productId,
          requestedQty: line.requestedQty,
          pickedQty: line.pickedQty,
        },
      ],
    }));

    const handlingUnitLines = (await this.prisma.handlingUnitLine.findMany({
      where: {
        tenantId,
        batchId: batch.id,
        productId: dto.productId ?? batch.productId,
        handlingUnit: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
      },
      include: {
        handlingUnit: { include: { shipments: { include: { shipment: true } } } },
        outboundOrder: true,
      } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    const shipmentsMap: Record<string, any> = {};
    handlingUnitLines.forEach((line) => {
      const huShipments = line.handlingUnit.shipments || [];
      huShipments.forEach((shu: any) => {
        const shipment = shu.shipment;
        if (!shipmentsMap[shipment.id]) {
          shipmentsMap[shipment.id] = {
            shipmentId: shipment.id,
            status: shipment.status,
            scheduledDeparture: shipment.scheduledDeparture,
            actualDeparture: shipment.actualDeparture,
            vehicleRef: shipment.vehicleRef,
            handlingUnits: [],
          };
        }
        shipmentsMap[shipment.id].handlingUnits.push({ handlingUnitId: line.handlingUnitId, code: line.handlingUnit.code });
      });
    });

    const response = {
      batch: {
        id: batch.id,
        code: batch.code || batch.batchCode,
        productId: batch.productId,
        productName: batch.product.name,
        expiryDate: batch.expiryDate,
      },
      inbound: {
        receipts,
      },
      internalMovements,
      outbound: {
        orders: outboundOrders,
        shipments: Object.values(shipmentsMap),
      },
    };

    await this.cache.setJson(cacheKey, response, TRACE_CACHE_TTL);
    return response;
  }

  async getCustomerShipmentsTrace(tenantId: string, dto: CustomerTraceQueryDto) {
    const cacheKey = this.cache.buildKey('trace:customer', [
      tenantId,
      dto.customerId ?? dto.customerCode,
      dto.fromDate,
      dto.toDate,
      dto.page,
      dto.limit,
    ]);
    const cached = await this.cache.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const pagination = this.pagination.buildPaginationParams(dto.page, dto.limit);
    const customer = await (this.prisma as any).customer.findFirst({
      where: {
        tenantId,
        ...(dto.customerId ? { id: dto.customerId } : {}),
        ...(dto.customerCode ? { code: dto.customerCode } : {}),
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);

    const shipments = await this.prisma.shipment.findMany({
      where: {
        tenantId,
        actualDeparture: { gte: from, lte: to },
        shipmentHandlingUnits: {
          some: { outboundOrder: { customerId: customer.id } as any },
        },
      },
      include: {
        shipmentHandlingUnits: {
          include: {
            outboundOrder: {
              include: {
                lines: { include: { product: true, pickingTaskLines: { include: { batch: true } } } },
              },
            },
          },
        } as any,
      },
      orderBy: { actualDeparture: 'desc' },
      ...pagination,
    });

    const formatted = shipments.map((shipment: any) => ({
      shipmentId: shipment.id,
      actualDeparture: shipment.actualDeparture,
      outboundOrders: shipment.shipmentHandlingUnits.map((shu: any) => ({
        outboundOrderId: shu.outboundOrderId,
        externalRef: shu.outboundOrder.externalRef,
        requestedShipDate: shu.outboundOrder.requestedShipDate,
        lines: shu.outboundOrder.lines.map((line: any) => ({
          productId: line.productId,
          productName: line.product.name,
          batchCode: line.pickingTaskLines[0]?.batch?.code ?? line.pickingTaskLines[0]?.batch?.batchCode,
          quantity: line.pickedQty,
          uom: line.uom,
        })),
      })),
    }));

    const response = {
      customer: { id: customer.id, code: customer.code, name: customer.name },
      period: { from, to },
      shipments: formatted,
    };
    await this.cache.setJson(cacheKey, response, TRACE_CACHE_TTL);
    return response;
  }

  async getProductHistory(tenantId: string, dto: ProductHistoryQueryDto) {
    const product = await this.prisma.product.findFirst({ where: { tenantId, id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    const pagination = this.pagination.buildPaginationParams(dto.page, dto.limit);

    const inbound = (await this.prisma.inboundReceiptLine.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        inboundReceipt: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
        createdAt: { gte: from, lte: to },
        ...(dto.batchCode ? { OR: [{ batchCode: dto.batchCode }, { batch: { batchCode: dto.batchCode } as any }] } : {}),
      } as any,
      include: { inboundReceipt: true, batch: true } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    const outbound = (await this.prisma.outboundOrderLine.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        outboundOrder: {
          requestedShipDate: { gte: from, lte: to },
          ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
        },
        ...(dto.batchCode
          ? { pickingTaskLines: { some: { batch: { OR: [{ batchCode: dto.batchCode }, { batchCode: dto.batchCode } as any] } } } }
          : {}),
      } as any,
      include: { outboundOrder: true, pickingTaskLines: { include: { batch: true } } } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    const movements = (await this.prisma.movementLine.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        movementHeader: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
        createdAt: { gte: from, lte: to },
        ...(dto.batchCode ? { OR: [{ batch: { batchCode: dto.batchCode } as any }, { batchCode: dto.batchCode }] } : {}),
      } as any,
      include: { movementHeader: true, batch: true } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    const inventorySnapshots = (await this.prisma.inventory.findMany({
      where: {
        tenantId,
        productId: dto.productId,
        ...(dto.batchCode ? { batch: { OR: [{ batchCode: dto.batchCode }, { batchCode: dto.batchCode } as any] } } : {}),
        location: dto.warehouseId ? { warehouseId: dto.warehouseId } : undefined,
      } as any,
      include: { batch: true } as any,
      orderBy: { createdAt: 'desc' },
      ...pagination,
    })) as any[];

    return {
      product: { id: product.id, name: product.name, sku: product.sku },
      batchCode: dto.batchCode,
      period: { from, to },
      inbound: inbound.map((line: any) => ({
        id: line.id,
        qty: line.receivedQty,
        uom: line.uom,
        batchCode: line.batch?.code ?? line.batch?.batchCode ?? line.batchCode,
        receiptId: line.inboundReceiptId,
      })),
      outbound: outbound.map((line: any) => ({
        id: line.id,
        qty: line.pickedQty,
        uom: line.uom,
        batchCode: line.pickingTaskLines[0]?.batch?.code ?? line.pickingTaskLines[0]?.batch?.batchCode,
        outboundOrderId: line.outboundOrderId,
      })),
      movements: movements.map((line: any) => ({
        id: line.id,
        qty: line.quantity,
        uom: line.uom,
        batchCode: line.batch?.code ?? line.batch?.batchCode ?? line.batchCode,
        movementType: line.movementHeader.movementType,
        fromLocationId: line.fromLocationId,
        toLocationId: line.toLocationId,
      })),
      inventorySnapshots: inventorySnapshots.map((inv: any) => ({
        id: inv.id,
        qty: inv.quantity,
        uom: inv.uom,
        batchCode: inv.batch?.code ?? inv.batch?.batchCode,
        locationId: inv.locationId,
      })),
    };
  }

  async getBatchOverview(tenantId: string, batchCode: string) {
    const batch = (await this.prisma.batch.findFirst({
      where: {
        tenantId,
        OR: [{ batchCode }, { code: batchCode }],
      } as any,
      include: { product: true } as any,
    })) as any;

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const inboundLine = (await this.prisma.inboundReceiptLine.findFirst({
      where: {
        tenantId,
        OR: [{ batchId: batch.id }, { batchCode }],
      } as any,
      include: { inboundReceipt: true },
      orderBy: { createdAt: 'asc' },
    })) as any;

    const receipt = inboundLine?.inboundReceipt;
    const movements = (await this.prisma.movementLine.findMany({
      where: {
        tenantId,
        OR: [{ batchId: batch.id }, { batchCode }],
      } as any,
      include: {
        movementHeader: true,
        fromLocation: true,
        toLocation: true,
        product: true,
        batch: true,
      } as any,
      orderBy: { createdAt: 'asc' },
    })) as any[];

    const outboundLines = (await this.prisma.outboundOrderLine.findMany({
      where: {
        tenantId,
        productId: batch.productId,
        pickingTaskLines: { some: { batchId: batch.id } },
      } as any,
      include: {
        outboundOrder: { include: { customer: true } },
        pickingTaskLines: { include: { batch: true } },
        product: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    const orderMap = new Map<string, { id: string; customer: string; date: string }>();
    outboundLines.forEach((line) => {
      const order = (line as any).outboundOrder;
      if (!order) return;
      const id = order.externalRef ?? order.id;
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, {
          id,
          customer: order.customer?.name ?? order.customerRef ?? order.customerId ?? 'N/A',
          date: (order.requestedShipDate ?? order.createdAt).toISOString(),
        });
      }
    });

    const customers = Array.from(new Set(Array.from(orderMap.values()).map((order) => order.customer)));

    return {
      batch: batch.batchCode ?? batch.code ?? batchCode,
      reception: {
        document: receipt?.externalRef ?? receipt?.id ?? batchCode,
        date: (receipt?.receivedAt ?? receipt?.createdAt ?? new Date()).toISOString(),
        supplier: undefined,
      },
      movements: movements.map((movement) => this.formatMovement(movement)),
      orders: Array.from(orderMap.values()),
      customers,
    };
  }

  async getProductTrace(tenantId: string, sku: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        OR: [{ sku }, { id: sku }],
      } as any,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const movements = (await this.prisma.movementLine.findMany({
      where: { tenantId, productId: product.id } as any,
      include: {
        movementHeader: true,
        fromLocation: true,
        toLocation: true,
        product: true,
        batch: true,
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as any[];

    const inventory = (await this.prisma.inventory.findMany({
      where: { tenantId, productId: product.id } as any,
      include: { location: true, batch: true },
      orderBy: { updatedAt: 'desc' },
    })) as any[];

    const locationsMap = new Map<string, { location: string; quantity: number; batch?: string }>();
    const batches = new Set<string>();

    inventory.forEach((record: any) => {
      const batchCode = record.batch?.batchCode ?? record.batch?.code ?? record.batchCode;
      if (batchCode) {
        batches.add(batchCode);
      }
      const key = `${record.location?.code ?? record.locationId}:${batchCode ?? ''}`;
      const entry = locationsMap.get(key) ?? {
        location: record.location?.code ?? record.locationId,
        quantity: 0,
        batch: batchCode,
      };
      entry.quantity += Number(record.quantity ?? 0);
      locationsMap.set(key, entry);
    });

    const inboundLines = (await this.prisma.inboundReceiptLine.findMany({
      where: { tenantId, productId: product.id } as any,
      include: { inboundReceipt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })) as any[];

    const outboundLines = (await this.prisma.outboundOrderLine.findMany({
      where: { tenantId, productId: product.id } as any,
      include: { outboundOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })) as any[];

    return {
      sku: product.sku,
      movements: movements.map((movement) => this.formatMovement(movement)),
      locations: Array.from(locationsMap.values()),
      batches: Array.from(batches),
      inbound: inboundLines.map((line: any) => ({
        document: line.inboundReceipt?.externalRef ?? line.inboundReceiptId,
        date: (line.inboundReceipt?.receivedAt ?? line.inboundReceipt?.createdAt ?? line.createdAt).toISOString(),
      })),
      outbound: outboundLines.map((line: any) => ({
        document: line.outboundOrder?.externalRef ?? line.outboundOrderId,
        date: (line.outboundOrder?.requestedShipDate ?? line.outboundOrder?.createdAt ?? line.createdAt).toISOString(),
      })),
    };
  }

  async getCustomerTrace(tenantId: string, customerKey: string) {
    const customer = await (this.prisma as any).customer.findFirst({
      where: {
        tenantId,
        OR: [{ id: customerKey }, { code: customerKey }, { name: customerKey }],
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const orders = (await this.prisma.outboundOrder.findMany({
      where: { tenantId, customerId: customer.id } as any,
      include: {
        lines: { include: { product: true, pickingTaskLines: { include: { batch: true } } } },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as any[];

    const productMap = new Map<string, { sku: string; units: number; batches: Set<string> }>();
    const orderPayload = orders.map((order) => {
      order.lines.forEach((line: any) => {
        const sku = line.product?.sku ?? line.productId;
        const entry = productMap.get(line.productId) ?? { sku, units: 0, batches: new Set<string>() };
        entry.units += Number(line.pickedQty ?? line.requestedQty ?? 0);
        line.pickingTaskLines?.forEach((taskLine: any) => {
          const batchCode = taskLine.batch?.batchCode ?? taskLine.batch?.code;
          if (batchCode) {
            entry.batches.add(batchCode);
          }
        });
        productMap.set(line.productId, entry);
      });
      const status = order.status === 'PICKED' ? 'delivered' : order.status.toLowerCase();
      return {
        id: order.externalRef ?? order.id,
        date: (order.requestedShipDate ?? order.createdAt).toISOString(),
        status,
      };
    });

    const deliveredCount = orders.filter((order) => order.status === 'PICKED').length;
    const otif = orders.length > 0 ? deliveredCount / orders.length : 0;

    return {
      customer: customer.name ?? customer.code,
      orders: orderPayload,
      products: Array.from(productMap.values()).map((entry) => ({
        sku: entry.sku,
        units: entry.units,
        batches: Array.from(entry.batches),
      })),
      otif,
    };
  }

  async getOrderTrace(tenantId: string, orderKey: string) {
    const order = (await this.prisma.outboundOrder.findFirst({
      where: {
        tenantId,
        OR: [{ id: orderKey }, { externalRef: orderKey }],
      } as any,
      include: {
        customer: true,
        lines: { include: { product: true, pickingTaskLines: { include: { batch: true } } } },
        pickingTasks: true,
      } as any,
    })) as any;

    if (!order) {
      throw new NotFoundException('Outbound order not found');
    }

    const shipments = (await this.prisma.shipment.findMany({
      where: {
        tenantId,
        shipmentHandlingUnits: { some: { outboundOrderId: order.id } },
      } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    const movements = (await this.prisma.movementLine.findMany({
      where: {
        tenantId,
        movementHeader: { reference: order.id } as any,
      },
      include: {
        movementHeader: true,
        fromLocation: true,
        toLocation: true,
        product: true,
        batch: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    return {
      orderId: order.externalRef ?? order.id,
      status: order.status,
      customer: order.customer?.name ?? order.customerRef ?? order.customerId ?? 'N/A',
      lines: order.lines.map((line: any) => ({
        sku: line.product?.sku ?? line.productId,
        batch: line.pickingTaskLines?.[0]?.batch?.batchCode ?? line.pickingTaskLines?.[0]?.batch?.code ?? undefined,
        qty: Number(line.pickedQty ?? line.requestedQty ?? 0),
      })),
      movements: movements.map((movement) => this.formatMovement(movement)),
      pickingTasks: order.pickingTasks.map((task: any) => ({
        id: task.id,
        user: task.pickerId ?? 'sin asignar',
        status: task.status,
      })),
      packing: null,
      shipments: shipments.map((shipment) => ({
        id: shipment.id,
        carrier: shipment.carrierRef ?? shipment.routeRef ?? 'N/A',
        timestamp: (shipment.actualDeparture ?? shipment.scheduledDeparture ?? shipment.createdAt).toISOString(),
      })),
    };
  }

  async getMovementTrace(tenantId: string, movementId: string) {
    const movement = await this.prisma.movementLine.findFirst({
      where: { id: movementId, tenantId } as any,
      include: {
        movementHeader: true,
        fromLocation: true,
        toLocation: true,
        product: true,
        batch: true,
      } as any,
    });

    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    const formatted = this.formatMovement(movement);
    return {
      movementId: movement.id,
      user: formatted.user,
      from: formatted.from,
      to: formatted.to,
      sku: formatted.sku,
      batch: formatted.batch,
      quantity: formatted.quantity,
      timestamp: formatted.timestamp,
      impact: formatted.impact,
    };
  }

  private formatMovement(movement: any) {
    const createdAt = movement.movementHeader?.createdAt ?? movement.createdAt;
    return {
      id: movement.id,
      from: movement.fromLocation?.code ?? movement.fromLocationId ?? 'N/A',
      to: movement.toLocation?.code ?? movement.toLocationId ?? 'N/A',
      user: movement.movementHeader?.createdBy ?? 'system',
      sku: movement.product?.sku ?? movement.productId,
      batch: movement.batch?.batchCode ?? movement.batch?.code ?? movement.batchCode ?? undefined,
      quantity: Number(movement.quantity ?? 0),
      timestamp: createdAt ? new Date(createdAt).toISOString() : undefined,
      impact: movement.movementHeader?.movementType ?? 'MOVEMENT',
    };
  }
}
