import { BadRequestException } from '@nestjs/common';
import { AdjustmentType, CycleCountStatus, Prisma, StockStatus } from '@prisma/client';
import { InventoryService } from '../../src/modules/inventory/inventory.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      warehouse: { findUnique: jest.fn() },
      cycleCountTask: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      cycleCountLine: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      location: {
        findUnique: jest.fn(),
      },
      movementHeader: {
        create: jest.fn(),
      },
      movementLine: {
        create: jest.fn(),
      },
      inventoryAdjustment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    service = new InventoryService(prisma as any);
  });

  it('creates cycle count task in pending state', async () => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1' });
    prisma.cycleCountTask.create.mockResolvedValue({ id: 'task-1', status: CycleCountStatus.PENDING });

    const task = await service.createCycleCountTask({ warehouseId: 'wh-1' });

    expect(task.status).toBe(CycleCountStatus.PENDING);
    expect(prisma.cycleCountTask.create).toHaveBeenCalled();
  });

  it('adds cycle count lines computing expected quantity', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({ id: 'task-1', status: CycleCountStatus.PENDING });
    prisma.inventory.findFirst.mockResolvedValue({ quantity: decimal(5) });
    prisma.cycleCountLine.findMany.mockResolvedValue([
      { id: 'line-1', expectedQty: decimal(5), productId: 'prod-1', locationId: 'loc-1' },
    ]);

    const lines = await service.addCycleCountLines('task-1', {
      lines: [
        { productId: 'prod-1', locationId: 'loc-1', uom: 'PCS', expectedQty: 0 },
      ],
    });

    expect(lines[0].expectedQty.equals(decimal(5))).toBe(true);
    expect(prisma.cycleCountLine.createMany).toHaveBeenCalled();
  });

  it('submits cycle count and triggers adjustments', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.IN_PROGRESS,
      warehouseId: 'wh-1',
    });

    prisma.cycleCountLine.findUnique.mockResolvedValue({
      id: 'line-1',
      cycleCountTaskId: 'task-1',
      expectedQty: decimal(5),
      productId: 'prod-1',
      locationId: 'loc-1',
    });

    prisma.cycleCountLine.update.mockResolvedValue({});

    jest.spyOn(service, 'applyInventoryAdjustment').mockResolvedValue({ id: 'inv-1' } as any);

    await service.submitCycleCount('task-1', {
      lines: [
        { lineId: 'line-1', countedQty: 6 },
      ],
    });

    expect(service.applyInventoryAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        newQty: 6,
      }),
      prisma,
    );
    expect(prisma.cycleCountTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CycleCountStatus.COMPLETED }) }),
    );
  });

  it('applies inventory adjustments creating movement and adjustment records', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.findFirst.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue({ id: 'inv-1', quantity: decimal(5) });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });

    await service.applyInventoryAdjustment({
      warehouseId: 'wh-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      newQty: 5,
      reason: 'Manual count',
    });

    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: decimal(5) }) }),
    );
    expect(prisma.inventoryAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adjustmentType: AdjustmentType.GAIN, differenceQty: decimal(5) }),
      }),
    );
    expect(prisma.movementLine.create).toHaveBeenCalled();
  });

  it('rejects negative target quantities', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });

    await expect(
      service.applyInventoryAdjustment({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        newQty: -1,
        reason: 'Invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('increaseStock', () => {
    beforeEach(() => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
      prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
      prisma.inventory.findFirst.mockResolvedValue(null);
    });

    it('creates inventory when none exists for the parameters', async () => {
      prisma.inventory.create.mockResolvedValue({ id: 'inv-1', quantity: decimal(3) });

      const result = await service.increaseStock({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 3,
        uom: 'PCS',
        stockStatus: StockStatus.AVAILABLE,
      } as any);

      expect(result).toEqual(expect.objectContaining({ id: 'inv-1' }));
      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: decimal(3) }) }),
      );
    });

    it('increments existing inventory record', async () => {
      prisma.inventory.findFirst.mockResolvedValue({ id: 'inv-2', quantity: decimal(2) });
      prisma.inventory.update.mockResolvedValue({ id: 'inv-2', quantity: decimal(5) });

      const result = await service.increaseStock({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 3,
        uom: 'PCS',
        stockStatus: StockStatus.AVAILABLE,
      } as any);

      expect(result).toEqual(expect.objectContaining({ quantity: decimal(5) }));
      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: decimal(5) }) }),
      );
    });

    it('validates location belongs to warehouse', async () => {
      prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-2' });

      await expect(
        service.increaseStock({
          warehouseId: 'wh-1',
          productId: 'prod-1',
          locationId: 'loc-1',
          quantity: 1,
          uom: 'PCS',
          stockStatus: StockStatus.AVAILABLE,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
