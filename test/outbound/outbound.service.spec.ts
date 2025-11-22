import { BadRequestException } from '@nestjs/common';
import { OutboundOrderStatus, PickingTaskStatus, Prisma, StockStatus } from '@prisma/client';
import { OutboundService } from '../../src/modules/outbound/outbound.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('OutboundService', () => {
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
});
