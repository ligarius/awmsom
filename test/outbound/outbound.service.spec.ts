import { BadRequestException } from '@nestjs/common';
import {
  OutboundOrderStatus,
  PickingTaskStatus,
  Prisma,
  StockStatus,
} from '@prisma/client';
import { OutboundService } from '../../src/modules/outbound/outbound.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('OutboundService', () => {
  enum ShipmentStatus {
    PLANNED = 'PLANNED',
    LOADING = 'LOADING',
    DISPATCHED = 'DISPATCHED',
  }

  enum HandlingUnitType {
    BOX = 'BOX',
  }

  let prisma: any;
  let tx: any;
  let service: OutboundService;

  beforeEach(() => {
    tx = {
      outboundOrder: { update: jest.fn() },
      outboundOrderLine: { update: jest.fn(), findMany: jest.fn() },
      inventory: { findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      pickingTask: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      pickingTaskLine: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      movementHeader: { create: jest.fn() },
      movementLine: { create: jest.fn() },
      handlingUnitLine: { aggregate: jest.fn(), create: jest.fn() },
      handlingUnit: { findUnique: jest.fn(), findMany: jest.fn() },
      shipmentHandlingUnit: { findMany: jest.fn(), create: jest.fn() },
      shipment: { update: jest.fn() },
    } as unknown as PrismaService;

    prisma = {
      warehouse: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      outboundOrder: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      outboundOrderLine: { findMany: jest.fn() },
      inventory: { findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      pickingTask: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      pickingTaskLine: { findMany: jest.fn() },
      movementHeader: { create: jest.fn() },
      movementLine: { create: jest.fn() },
      handlingUnit: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      handlingUnitLine: { aggregate: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      shipment: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      shipmentHandlingUnit: { findMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((cb) => cb(tx)),
    } as unknown as PrismaService;

    service = new OutboundService(prisma);
  });

  it('creates an outbound order in DRAFT with lines', async () => {
    (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 'wh-1' });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'prod-1' });
    (prisma.outboundOrder.create as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      status: OutboundOrderStatus.DRAFT,
      lines: [],
    });

    const result = await service.createOutboundOrder({
      warehouseId: 'wh-1',
      externalRef: 'SO-1',
      lines: [{ productId: 'prod-1', requestedQty: 2, uom: 'EA' }],
    });

    expect(result.status).toBe(OutboundOrderStatus.DRAFT);
    expect(prisma.outboundOrder.create).toHaveBeenCalled();
  });

  it('releases an order and allocates fully', async () => {
    (prisma.outboundOrder.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      warehouseId: 'wh-1',
      status: OutboundOrderStatus.DRAFT,
      lines: [
        {
          id: 'line-1',
          productId: 'prod-1',
          requestedQty: decimal(5),
          allocatedQty: decimal(0),
          product: { id: 'prod-1', requiresExpiryDate: false },
        },
      ],
    });

    (tx.inventory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'inv-1',
        productId: 'prod-1',
        quantity: decimal(5),
        uom: 'EA',
        stockStatus: StockStatus.AVAILABLE,
        locationId: 'loc-1',
      },
    ]);

    (tx.inventory.findFirst as jest.Mock).mockResolvedValue(null);
    (tx.inventory.create as jest.Mock).mockResolvedValue({});
    (tx.outboundOrderLine.update as jest.Mock).mockResolvedValue({});
    (tx.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { outboundOrderId: 'ord-1', requestedQty: decimal(5), allocatedQty: decimal(5) },
    ]);
    (tx.outboundOrder.update as jest.Mock).mockResolvedValue({ status: OutboundOrderStatus.FULLY_ALLOCATED, lines: [] });

    const result = await service.releaseOutboundOrder('ord-1');

    expect(tx.inventory.update).toHaveBeenCalled();
    expect(tx.inventory.create).toHaveBeenCalled();
    expect(result.status).toBe(OutboundOrderStatus.FULLY_ALLOCATED);
  });

  it('creates picking task based on reserved inventory', async () => {
    (prisma.outboundOrder.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      warehouseId: 'wh-1',
      status: OutboundOrderStatus.FULLY_ALLOCATED,
      lines: [{ id: 'line-1', productId: 'prod-1' }],
    });

    (tx.pickingTask.create as jest.Mock).mockResolvedValue({ id: 'task-1' });
    (tx.inventory.findMany as jest.Mock).mockResolvedValue([
      { productId: 'prod-1', batchId: null, locationId: 'loc-1', quantity: decimal(3), uom: 'EA' },
    ]);
    (tx.pickingTaskLine.create as jest.Mock).mockResolvedValue({});
    (tx.outboundOrder.update as jest.Mock).mockResolvedValue({});
    (tx.pickingTask.findUnique as jest.Mock).mockResolvedValue({ id: 'task-1', lines: [] });

    const task = await service.createPickingTask('ord-1', { pickerId: 'picker-1' });

    expect(task.id).toBe('task-1');
    expect(tx.pickingTaskLine.create).toHaveBeenCalled();
  });

  it('confirms picking lines and closes task', async () => {
    (prisma.pickingTask.findUnique as jest.Mock).mockResolvedValue({
      id: 'task-1',
      warehouseId: 'wh-1',
      outboundOrderId: 'ord-1',
      status: PickingTaskStatus.IN_PROGRESS,
      lines: [
        {
          id: 'ptl-1',
          productId: 'prod-1',
          batchId: null,
          fromLocationId: 'loc-1',
          quantityToPick: decimal(2),
          quantityPicked: decimal(0),
          outboundOrderLineId: 'line-1',
          uom: 'EA',
        },
      ],
      outboundOrder: { id: 'ord-1', lines: [] },
    });

    (tx.movementHeader.create as jest.Mock).mockResolvedValue({ id: 'mv-1' });
    (tx.inventory.findFirst as jest.Mock).mockResolvedValue({ id: 'res-1', quantity: decimal(5) });
    (tx.pickingTaskLine.update as jest.Mock).mockResolvedValue({});
    (tx.outboundOrderLine.update as jest.Mock).mockResolvedValue({});
    (tx.movementLine.create as jest.Mock).mockResolvedValue({});
    (tx.pickingTaskLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'ptl-1', quantityToPick: decimal(2), quantityPicked: decimal(2) },
    ]);
    (tx.pickingTask.update as jest.Mock).mockResolvedValue({ id: 'task-1', status: PickingTaskStatus.COMPLETED });
    (tx.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { outboundOrderId: 'ord-1', requestedQty: decimal(2), pickedQty: decimal(2) },
    ]);
    (tx.outboundOrder.update as jest.Mock).mockResolvedValue({});

    const result = await service.confirmPickingTask('task-1', {
      lines: [{ pickingTaskLineId: 'ptl-1', quantityPicked: 2 }],
    });

    expect(result.status).toBe(PickingTaskStatus.COMPLETED);
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { quantity: decimal(3) },
    });
    expect(tx.pickingTaskLine.update).toHaveBeenCalled();
  });

  it('throws when starting completed picking task', async () => {
    (prisma.pickingTask.findUnique as jest.Mock).mockResolvedValue({ id: 'task-1', status: PickingTaskStatus.COMPLETED });

    await expect(service.startPickingTask('task-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a handling unit', async () => {
    (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 'wh-1' });
    (prisma.handlingUnit.create as jest.Mock).mockResolvedValue({ id: 'hu-1', code: 'HU-1' });

    const hu = await service.createHandlingUnit({
      warehouseId: 'wh-1',
      handlingUnitType: HandlingUnitType.BOX,
      code: 'HU-1',
    });

    expect(hu.code).toBe('HU-1');
    expect(prisma.handlingUnit.create).toHaveBeenCalled();
  });

  it('adds items to a handling unit when within picked quantity', async () => {
    (prisma.handlingUnit.findUnique as jest.Mock).mockResolvedValue({ id: 'hu-1', warehouseId: 'wh-1' });
    (prisma.outboundOrder.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      warehouseId: 'wh-1',
      lines: [
        {
          id: 'line-1',
          pickedQty: decimal(5),
          productId: 'prod-1',
        },
      ],
    });
    (tx.handlingUnitLine.aggregate as jest.Mock).mockResolvedValue({ _sum: { quantity: decimal(2) } });
    (tx.handlingUnitLine.create as jest.Mock).mockResolvedValue({});
    (tx.handlingUnit.findUnique as jest.Mock).mockResolvedValue({ id: 'hu-1', lines: [] });

    const result = await service.addItemsToHandlingUnit('hu-1', {
      outboundOrderId: 'ord-1',
      items: [
        { outboundOrderLineId: 'line-1', productId: 'prod-1', quantity: 1, uom: 'EA' },
      ],
    });

    expect(result.id).toBe('hu-1');
    expect(tx.handlingUnitLine.create).toHaveBeenCalled();
  });

  it('rejects packing more than picked quantity', async () => {
    (prisma.handlingUnit.findUnique as jest.Mock).mockResolvedValue({ id: 'hu-1', warehouseId: 'wh-1' });
    (prisma.outboundOrder.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-1',
      warehouseId: 'wh-1',
      lines: [{ id: 'line-1', pickedQty: decimal(1), productId: 'prod-1' }],
    });
    (tx.handlingUnitLine.aggregate as jest.Mock).mockResolvedValue({ _sum: { quantity: decimal(1) } });

    await expect(
      service.addItemsToHandlingUnit('hu-1', {
        outboundOrderId: 'ord-1',
        items: [{ outboundOrderLineId: 'line-1', productId: 'prod-1', quantity: 1, uom: 'EA' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates shipment and assigns handling units', async () => {
    (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 'wh-1' });
    (prisma.shipment.create as jest.Mock).mockResolvedValue({ id: 'sh-1', status: ShipmentStatus.PLANNED });

    const shipment = await service.createShipment({ warehouseId: 'wh-1' });
    expect(shipment.status).toBe(ShipmentStatus.PLANNED);

    (prisma.shipment.findUnique as jest.Mock).mockResolvedValue({ id: 'sh-1', warehouseId: 'wh-1', status: ShipmentStatus.PLANNED });
    (prisma.handlingUnit.findMany as jest.Mock).mockResolvedValue([
      { id: 'hu-1', warehouseId: 'wh-1', lines: [{ outboundOrderId: 'ord-1' }] },
    ]);
    (tx.shipmentHandlingUnit.findMany as jest.Mock).mockResolvedValue([]);
    (tx.shipmentHandlingUnit.create as jest.Mock).mockResolvedValue({});
    (tx.shipment.update as jest.Mock).mockResolvedValue({ status: ShipmentStatus.LOADING, shipmentHandlingUnits: [] });

    const updated = await service.assignHandlingUnitsToShipment('sh-1', { handlingUnitIds: ['hu-1'] });
    expect(updated.status).toBe(ShipmentStatus.LOADING);
  });

  it('does not dispatch shipment without handling units', async () => {
    (prisma.shipment.findUnique as jest.Mock).mockResolvedValue({
      id: 'sh-1',
      status: ShipmentStatus.PLANNED,
      warehouseId: 'wh-1',
      shipmentHandlingUnits: [],
    });

    await expect(service.dispatchShipment('sh-1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dispatches shipment with movement creation', async () => {
    (prisma.shipment.findUnique as jest.Mock).mockResolvedValue({
      id: 'sh-1',
      status: ShipmentStatus.LOADING,
      warehouseId: 'wh-1',
      shipmentHandlingUnits: [{ id: 'shu-1' }],
    });
    (tx.handlingUnit.findMany as jest.Mock).mockResolvedValue([
      { id: 'hu-1', lines: [{ productId: 'prod-1', batchId: null, quantity: decimal(1), uom: 'EA' }] },
    ]);
    (tx.movementHeader.create as jest.Mock).mockResolvedValue({ id: 'mv-1' });
    (tx.movementLine.create as jest.Mock).mockResolvedValue({});
    (tx.shipment.update as jest.Mock).mockResolvedValue({ id: 'sh-1', status: ShipmentStatus.DISPATCHED });

    const dispatched = await service.dispatchShipment('sh-1', {});
    expect(dispatched.status).toBe(ShipmentStatus.DISPATCHED);
    expect(tx.movementLine.create).toHaveBeenCalled();
  });
});
