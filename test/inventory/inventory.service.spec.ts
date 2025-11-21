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
        groupBy: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      batch: {
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
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.PENDING,
      warehouseId: 'wh-1',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.groupBy.mockResolvedValue([{ _sum: { quantity: decimal(5) } }]);
    prisma.cycleCountLine.findMany.mockResolvedValue([
      { id: 'line-1', expectedQty: decimal(5), productId: 'prod-1', locationId: 'loc-1' },
    ]);

    const lines = await service.addCycleCountLines('task-1', {
      lines: [{ productId: 'prod-1', locationId: 'loc-1', uom: 'PCS' }],
    });

    expect(lines[0].expectedQty.equals(decimal(5))).toBe(true);
    expect(prisma.inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 'prod-1',
          batchId: null,
          locationId: 'loc-1',
          uom: 'PCS',
          stockStatus: expect.objectContaining({ in: expect.arrayContaining([StockStatus.RESERVED]) }),
        }),
        by: ['productId', 'batchId', 'locationId', 'uom'],
        _sum: { quantity: true },
      }),
    );
    expect(prisma.cycleCountLine.createMany).toHaveBeenCalled();
  });

  it('persists provided expected quantity when supplied in request', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.PENDING,
      warehouseId: 'wh-1',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.cycleCountLine.findMany.mockResolvedValue([
      { id: 'line-provided', expectedQty: decimal(9), productId: 'prod-1', locationId: 'loc-1' },
    ]);

    const getExpectedSpy = jest.spyOn<any, any>(service as any, 'getExpectedQty');

    const lines = await service.addCycleCountLines('task-1', {
      lines: [{ productId: 'prod-1', locationId: 'loc-1', uom: 'PCS', expectedQty: 9 }],
    });

    expect(getExpectedSpy).not.toHaveBeenCalled();
    expect(lines[0].expectedQty.equals(decimal(9))).toBe(true);
    expect(prisma.cycleCountLine.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ expectedQty: decimal(9) })]) }),
    );
  });

  it('includes reserved and in-transit stock when calculating expected quantities', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValueOnce({
      id: 'task-1',
      status: CycleCountStatus.PENDING,
      warehouseId: 'wh-1',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.groupBy.mockResolvedValueOnce([{ _sum: { quantity: decimal(7) } }]);
    prisma.cycleCountLine.findMany.mockResolvedValue([
      { id: 'line-agg', expectedQty: decimal(7), productId: 'prod-1', locationId: 'loc-1', uom: 'PCS' },
    ]);

    const lines = await service.addCycleCountLines('task-1', {
      lines: [{ productId: 'prod-1', locationId: 'loc-1', uom: 'PCS' }],
    });

    prisma.cycleCountTask.findUnique.mockResolvedValueOnce({
      id: 'task-1',
      status: CycleCountStatus.IN_PROGRESS,
      warehouseId: 'wh-1',
    });
    prisma.cycleCountLine.findUnique.mockResolvedValue({
      id: 'line-agg',
      cycleCountTaskId: 'task-1',
      expectedQty: decimal(7),
      productId: 'prod-1',
      locationId: 'loc-1',
      uom: 'PCS',
    });
    prisma.cycleCountLine.update.mockResolvedValue({});
    prisma.cycleCountTask.update.mockResolvedValue({});

    jest.spyOn(service, 'applyInventoryAdjustment').mockResolvedValue({} as any);

    await service.submitCycleCount('task-1', {
      lines: [{ lineId: 'line-agg', countedQty: 7 }],
    });

    expect(lines[0].expectedQty.equals(decimal(7))).toBe(true);
    expect(service.applyInventoryAdjustment).not.toHaveBeenCalled();
  });

  it('rejects invalid product when adding cycle count lines', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.PENDING,
      warehouseId: 'wh-1',
    });
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.addCycleCountLines('task-1', {
        lines: [
          { productId: 'missing', locationId: 'loc-1', uom: 'PCS', expectedQty: 0 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cross-warehouse location when adding cycle count lines', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.PENDING,
      warehouseId: 'wh-1',
    });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
    prisma.batch.findUnique?.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-2' });

    await expect(
      service.addCycleCountLines('task-1', {
        lines: [
          { productId: 'prod-1', batchId: 'batch-1', locationId: 'loc-1', uom: 'PCS', expectedQty: 0 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      uom: 'BOX',
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
        uom: 'BOX',
      }),
      prisma,
    );
    expect(prisma.cycleCountTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CycleCountStatus.COMPLETED }) }),
    );
  });

  it('submits cycle count using predominant non-available stock status', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.IN_PROGRESS,
      warehouseId: 'wh-1',
    });

    prisma.cycleCountLine.findUnique.mockResolvedValue({
      id: 'line-1',
      cycleCountTaskId: 'task-1',
      expectedQty: decimal(2),
      productId: 'prod-1',
      locationId: 'loc-1',
      uom: 'PCS',
    });

    prisma.cycleCountLine.update.mockResolvedValue({});

    const helperSpy = jest
      .spyOn<any, any>(service as any, 'determineCountStockStatus')
      .mockResolvedValue(StockStatus.PICKING);
    jest.spyOn(service, 'applyInventoryAdjustment').mockResolvedValue({ id: 'inv-1' } as any);

    await service.submitCycleCount('task-1', {
      lines: [
        { lineId: 'line-1', countedQty: 1 },
      ],
    });

    expect(helperSpy).toHaveBeenCalledWith('prod-1', undefined, 'loc-1', 'PCS', prisma);
    expect(service.applyInventoryAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ stockStatus: StockStatus.PICKING }),
      prisma,
    );
  });

  it('reconciles cycle count using line UOM and updates existing inventory', async () => {
    prisma.cycleCountTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: CycleCountStatus.IN_PROGRESS,
      warehouseId: 'wh-1',
    });

    prisma.cycleCountLine.findUnique.mockResolvedValue({
      id: 'line-1',
      cycleCountTaskId: 'task-1',
      expectedQty: decimal(12),
      productId: 'prod-1',
      locationId: 'loc-1',
      uom: 'BOX',
    });

    prisma.cycleCountLine.update.mockResolvedValue({});
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.findFirst.mockResolvedValue({ id: 'inv-box', quantity: decimal(12), uom: 'BOX' });
    prisma.inventory.update.mockResolvedValue({ id: 'inv-box', quantity: decimal(10), uom: 'BOX' });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.inventoryAdjustment.create.mockResolvedValue({ id: 'adj-1' });

    await service.submitCycleCount('task-1', {
      lines: [
        { lineId: 'line-1', countedQty: 10 },
      ],
    });

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ uom: 'BOX' }) }),
    );
    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-box' }, data: { quantity: decimal(10) } }),
    );
    expect(prisma.inventory.create).not.toHaveBeenCalled();
    expect(prisma.movementLine.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ uom: 'BOX', quantity: decimal(2) }) }),
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

  it('updates reserved inventory without duplicating available stock', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.groupBy.mockResolvedValue([{ stockStatus: StockStatus.RESERVED, _sum: { quantity: decimal(5) } }]);
    prisma.inventory.findFirst.mockResolvedValue({
      id: 'inv-res',
      quantity: decimal(5),
      stockStatus: StockStatus.RESERVED,
    });
    prisma.inventory.update.mockResolvedValue({ id: 'inv-res', quantity: decimal(3), stockStatus: StockStatus.RESERVED });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.inventoryAdjustment.create.mockResolvedValue({ id: 'adj-1' });

    await service.applyInventoryAdjustment({
      warehouseId: 'wh-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      newQty: 3,
      reason: 'Cycle count adjustment',
    });

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ stockStatus: StockStatus.RESERVED }) }),
    );
    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-res' }, data: { quantity: decimal(3) } }),
    );
    expect(prisma.inventory.create).not.toHaveBeenCalled();
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

  it('updates inventory and movements using provided non-default UOM', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'PCS' });
    prisma.location.findUnique.mockResolvedValue({ id: 'loc-1', warehouseId: 'wh-1' });
    prisma.inventory.findFirst.mockResolvedValue({ id: 'inv-box', quantity: decimal(12), uom: 'BOX' });
    prisma.inventory.update.mockResolvedValue({ id: 'inv-box', quantity: decimal(10), uom: 'BOX' });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });

    await service.applyInventoryAdjustment({
      warehouseId: 'wh-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      newQty: 10,
      uom: 'BOX',
      reason: 'Cycle count adjustment',
    });

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ uom: 'BOX' }) }),
    );
    expect(prisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-box' }, data: { quantity: decimal(10) } }),
    );
    expect(prisma.inventory.create).not.toHaveBeenCalled();
    expect(prisma.movementLine.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ uom: 'BOX', quantity: decimal(2) }) }),
    );
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
