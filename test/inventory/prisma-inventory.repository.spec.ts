import { Prisma, StockStatus } from '@prisma/client';
import { PrismaInventoryRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-inventory.repository';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/common/tenant-context.service';
import { StockItem } from '../../src/modules/inventory/domain/entities/stock-item.entity';
import { StockState } from '../../src/modules/inventory/domain/enums/stock-state.enum';

describe('PrismaInventoryRepository', () => {
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let repository: PrismaInventoryRepository;

  const now = new Date();

  beforeEach(() => {
    prisma = {
      inventory: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      batch: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    tenantContext = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<TenantContextService>;

    repository = new PrismaInventoryRepository(prisma, tenantContext);
  });

  it('finds inventory within tenant scope', async () => {
    (prisma.inventory.findFirst as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      productId: 'prod-1',
      quantity: new Prisma.Decimal(10),
      uom: 'PCS',
      locationId: 'loc-1',
      stockStatus: StockStatus.AVAILABLE,
      batchId: 'batch-1',
      batch: { batchCode: 'LOT-1', expiryDate: null },
      createdAt: now,
      updatedAt: now,
    });

    const result = await repository.findByProductLotAndLocation('prod-1', 'LOT-1', 'loc-1');

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        batch: { batchCode: 'LOT-1', tenantId: 'tenant-1' },
      },
      include: { batch: true },
    });
    expect(result?.id).toBe('inv-1');
  });

  it('returns null when inventory belongs to another tenant', async () => {
    (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await repository.findByProductLotAndLocation('prod-2', 'LOT-2', 'loc-2');

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        productId: 'prod-2',
        locationId: 'loc-2',
        batch: { batchCode: 'LOT-2', tenantId: 'tenant-1' },
      },
      include: { batch: true },
    });
    expect(result).toBeNull();
  });

  it('updates inventory within tenant scope', async () => {
    (prisma.batch.findFirst as jest.Mock).mockResolvedValue({ id: 'batch-1' });
    (prisma.inventory.update as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      tenantId: 'tenant-1',
      productId: 'prod-1',
      quantity: new Prisma.Decimal(15),
      uom: 'PCS',
      locationId: 'loc-1',
      stockStatus: StockStatus.AVAILABLE,
      batchId: 'batch-1',
      batch: { batchCode: 'LOT-1', expiryDate: null },
      createdAt: now,
      updatedAt: now,
    });

    const stock = new StockItem('prod-1', 15, 'PCS', 'loc-1', 'LOT-1', undefined, StockState.AVAILABLE, 'inv-1');
    const result = await repository.save(stock);

    expect(prisma.inventory.update).toHaveBeenCalledWith({
      where: { id: 'inv-1', tenantId: 'tenant-1' },
      data: {
        quantity: new Prisma.Decimal(15),
        uom: 'PCS',
        locationId: 'loc-1',
        stockStatus: StockStatus.AVAILABLE,
        batchId: 'batch-1',
        updatedBy: undefined,
      },
      include: { batch: true },
    });
    expect(result.quantity).toBe(15);
  });

  it('creates inventory with tenant scope and resolves batch', async () => {
    (prisma.batch.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.batch.create as jest.Mock).mockResolvedValue({ id: 'batch-2' });
    (prisma.inventory.create as jest.Mock).mockResolvedValue({
      id: 'inv-2',
      tenantId: 'tenant-1',
      productId: 'prod-1',
      quantity: new Prisma.Decimal(5),
      uom: 'PCS',
      locationId: 'loc-1',
      stockStatus: StockStatus.AVAILABLE,
      batchId: 'batch-2',
      batch: { batchCode: 'LOT-2', expiryDate: null },
      createdAt: now,
      updatedAt: now,
    });

    const stock = new StockItem('prod-1', 5, 'PCS', 'loc-1', 'LOT-2');
    const result = await repository.save(stock);

    expect(prisma.batch.findFirst).toHaveBeenCalledWith({
      where: { productId: 'prod-1', batchCode: 'LOT-2', tenantId: 'tenant-1' },
    });
    expect(prisma.batch.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', productId: 'prod-1', batchCode: 'LOT-2', expiryDate: undefined },
    });
    expect(prisma.inventory.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        productId: 'prod-1',
        quantity: new Prisma.Decimal(5),
        uom: 'PCS',
        locationId: 'loc-1',
        stockStatus: StockStatus.AVAILABLE,
        batchId: 'batch-2',
        createdBy: undefined,
        updatedBy: undefined,
      },
      include: { batch: true },
    });
    expect(result.lotCode).toBe('LOT-2');
  });

  it('rejects updating inventory from another tenant', async () => {
    (prisma.batch.findFirst as jest.Mock).mockResolvedValue({ id: 'batch-3' });
    (prisma.inventory.update as jest.Mock).mockRejectedValue(new Error('Record to update not found'));

    const stock = new StockItem('prod-9', 2, 'PCS', 'loc-9', 'LOT-9', undefined, StockState.AVAILABLE, 'inv-9');

    await expect(repository.save(stock)).rejects.toThrow('Record to update not found');
    expect(prisma.inventory.update).toHaveBeenCalledWith({
      where: { id: 'inv-9', tenantId: 'tenant-1' },
      data: {
        quantity: new Prisma.Decimal(2),
        uom: 'PCS',
        locationId: 'loc-9',
        stockStatus: StockStatus.AVAILABLE,
        batchId: 'batch-3',
        updatedBy: undefined,
      },
      include: { batch: true },
    });
  });

  it('lists available lots within tenant scope', async () => {
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'inv-3',
        tenantId: 'tenant-1',
        productId: 'prod-1',
        quantity: new Prisma.Decimal(3),
        uom: 'PCS',
        locationId: 'loc-1',
        stockStatus: StockStatus.AVAILABLE,
        batchId: 'batch-3',
        batch: { batchCode: 'LOT-3', expiryDate: null },
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const results = await repository.listAvailableLots('prod-1');

    expect(prisma.inventory.findMany).toHaveBeenCalledWith({
      where: { productId: 'prod-1', tenantId: 'tenant-1' },
      include: { batch: true },
    });
    expect(results).toHaveLength(1);
    expect(results[0].lotCode).toBe('LOT-3');
  });
});
