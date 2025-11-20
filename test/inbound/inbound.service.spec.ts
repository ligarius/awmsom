import { BadRequestException } from '@nestjs/common';
import {
  InboundReceiptStatus,
  MovementStatus,
  MovementType,
  Prisma,
  StockStatus,
} from '@prisma/client';
import { InboundService } from '../../src/modules/inbound/inbound.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('InboundService', () => {
  let prisma: any;
  let tx: any;
  let inventoryService: jest.Mocked<InventoryService>;
  let service: InboundService;

  beforeEach(() => {
    tx = {
      inboundReceipt: { findUnique: jest.fn(), update: jest.fn() },
      inboundReceiptLine: { update: jest.fn(), findMany: jest.fn() },
      warehouse: { findUnique: jest.fn() },
      batch: { findFirst: jest.fn(), create: jest.fn() },
      location: { findUnique: jest.fn() },
      movementHeader: { create: jest.fn() },
      product: { findUnique: jest.fn() },
    } as unknown as PrismaService;

    prisma = {
      warehouse: { findUnique: jest.fn() },
      inboundReceipt: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      inboundReceiptLine: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      product: { findUnique: jest.fn() },
      batch: { findFirst: jest.fn(), create: jest.fn() },
      location: { findUnique: jest.fn() },
      inventory: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      movementHeader: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(tx)),
    } as unknown as PrismaService;

    inventoryService = {
      increaseStock: jest.fn(),
    } as unknown as jest.Mocked<InventoryService>;

    service = new InboundService(prisma, inventoryService);
  });

  it('creates a receipt in DRAFT status', async () => {
    (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 'wh-1' });
    (prisma.inboundReceipt.create as jest.Mock).mockResolvedValue({ id: 'rec-1', status: InboundReceiptStatus.DRAFT });

    const result = await service.createReceipt({ warehouseId: 'wh-1', externalRef: 'OC-123' });

    expect(result).toEqual(expect.objectContaining({ status: InboundReceiptStatus.DRAFT }));
    expect(prisma.inboundReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ warehouseId: 'wh-1', status: InboundReceiptStatus.DRAFT }),
    });
  });

  it('adds a line to a draft receipt', async () => {
    (prisma.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({ id: 'rec-1', status: InboundReceiptStatus.DRAFT });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'prod-1', requiresBatch: false, requiresExpiryDate: false });
    (prisma.inboundReceiptLine.create as jest.Mock).mockResolvedValue({ id: 'line-1' });

    const line = await service.addLine('rec-1', {
      productId: 'prod-1',
      expectedQty: 5,
      uom: 'EA',
    });

    expect(line).toEqual({ id: 'line-1' });
    expect(prisma.inboundReceiptLine.create).toHaveBeenCalled();
  });

  it('rejects adding a line when receipt is already received', async () => {
    (prisma.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({ id: 'rec-1', status: InboundReceiptStatus.RECEIVED });

    await expect(
      service.addLine('rec-1', { productId: 'prod-1', expectedQty: 1, uom: 'EA' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms receipt and updates inventory for product without batch', async () => {
    (tx.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'rec-1',
      warehouseId: 'wh-1',
      status: InboundReceiptStatus.DRAFT,
      receivedAt: null,
      lines: [
        {
          id: 'line-1',
          inboundReceiptId: 'rec-1',
          productId: 'prod-1',
          expectedQty: decimal(5),
          receivedQty: decimal(0),
          uom: 'EA',
          batchCode: null,
          expiryDate: null,
          product: { id: 'prod-1', requiresBatch: false, requiresExpiryDate: false },
        },
      ],
      warehouse: {},
    });
    (tx.location.findUnique as jest.Mock).mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    (tx.inboundReceiptLine.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'line-1',
        expectedQty: decimal(5),
        receivedQty: decimal(5),
      },
    ]);
    (tx.movementHeader.create as jest.Mock).mockResolvedValue({ id: 'mov-1', lines: [] });
    (tx.inboundReceiptLine.update as jest.Mock).mockResolvedValue({});
    (tx.inboundReceipt.update as jest.Mock).mockResolvedValue({});
    inventoryService.increaseStock.mockResolvedValue({} as any);

    const result = await service.confirmReceipt('rec-1', {
      toLocationId: 'loc-1',
    });

    expect(inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        batchId: undefined,
        locationId: 'loc-1',
        stockStatus: StockStatus.AVAILABLE,
      }),
      tx,
    );
    expect(tx.movementHeader.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: MovementType.INBOUND_RECEIPT,
          status: MovementStatus.COMPLETED,
        }),
      }),
    );
    expect(result.status).toBe(InboundReceiptStatus.RECEIVED);
  });

  it('throws when received quantity exceeds pending amount', async () => {
    (tx.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'rec-1',
      warehouseId: 'wh-1',
      status: InboundReceiptStatus.DRAFT,
      receivedAt: null,
      lines: [
        {
          id: 'line-1',
          inboundReceiptId: 'rec-1',
          productId: 'prod-1',
          expectedQty: decimal(5),
          receivedQty: decimal(3),
          uom: 'EA',
          batchCode: null,
          expiryDate: null,
          product: { id: 'prod-1', requiresBatch: false, requiresExpiryDate: false },
        },
      ],
      warehouse: {},
    });

    (tx.location.findUnique as jest.Mock).mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });

    await expect(
      service.confirmReceipt('rec-1', {
        toLocationId: 'loc-1',
        lines: [{ lineId: 'line-1', receivedQty: 3 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates or reuses batch for products requiring it during confirmation', async () => {
    (tx.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'rec-2',
      warehouseId: 'wh-1',
      status: InboundReceiptStatus.DRAFT,
      receivedAt: null,
      lines: [
        {
          id: 'line-2',
          inboundReceiptId: 'rec-2',
          productId: 'prod-2',
          expectedQty: decimal(3),
          receivedQty: decimal(0),
          uom: 'EA',
          batchCode: 'B-1',
          expiryDate: new Date('2025-01-01'),
          product: { id: 'prod-2', requiresBatch: true, requiresExpiryDate: true },
        },
      ],
      warehouse: {},
    });
    (tx.location.findUnique as jest.Mock).mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    (tx.batch.findFirst as jest.Mock).mockResolvedValue(null);
    (tx.batch.create as jest.Mock).mockResolvedValue({ id: 'batch-1' });
    (tx.inboundReceiptLine.update as jest.Mock).mockResolvedValue({});
    (tx.inboundReceiptLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'line-2', expectedQty: decimal(3), receivedQty: decimal(3) },
    ]);
    (tx.inboundReceipt.update as jest.Mock).mockResolvedValue({});
    (tx.movementHeader.create as jest.Mock).mockResolvedValue({ id: 'mov-2', lines: [] });
    inventoryService.increaseStock.mockResolvedValue({} as any);

    await service.confirmReceipt('rec-2', {
      toLocationId: 'loc-1',
      lines: [{ lineId: 'line-2', receivedQty: 3, batchCode: 'B-1', expiryDate: '2025-01-01' }],
    });

    expect(tx.batch.create).toHaveBeenCalled();
    expect(inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'batch-1' }),
      tx,
    );

    (tx.batch.findFirst as jest.Mock).mockResolvedValue({ id: 'batch-1', productId: 'prod-2', batchCode: 'B-1' });
    (tx.batch.create as jest.Mock).mockClear();

    await service.confirmReceipt('rec-2', {
      toLocationId: 'loc-1',
      lines: [{ lineId: 'line-2', receivedQty: 1, batchCode: 'B-1', expiryDate: '2025-01-01' }],
    });

    expect(tx.batch.create).not.toHaveBeenCalled();
  });

  it('rolls back receipt confirmation when movement creation fails', async () => {
    (tx.inboundReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'rec-3',
      warehouseId: 'wh-1',
      status: InboundReceiptStatus.DRAFT,
      receivedAt: null,
      lines: [
        {
          id: 'line-3',
          inboundReceiptId: 'rec-3',
          productId: 'prod-3',
          expectedQty: decimal(2),
          receivedQty: decimal(0),
          uom: 'EA',
          batchCode: null,
          expiryDate: null,
          product: { id: 'prod-3', requiresBatch: false, requiresExpiryDate: false },
        },
      ],
      warehouse: {},
    });
    (tx.location.findUnique as jest.Mock).mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    (tx.inboundReceiptLine.update as jest.Mock).mockResolvedValue({});
    (tx.inboundReceiptLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'line-3', expectedQty: decimal(2), receivedQty: decimal(2) },
    ]);
    (tx.movementHeader.create as jest.Mock).mockRejectedValue(new Error('movement failure'));
    inventoryService.increaseStock.mockResolvedValue({} as any);

    await expect(
      service.confirmReceipt('rec-3', {
        toLocationId: 'loc-1',
        lines: [{ lineId: 'line-3', receivedQty: 2 }],
      }),
    ).rejects.toThrow('movement failure');

    expect(inventoryService.increaseStock).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod-3', warehouseId: 'wh-1' }),
      tx,
    );
    expect(tx.inboundReceipt.update).not.toHaveBeenCalled();
  });
});
