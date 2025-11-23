import { PrismaWarehouseRepository } from '../../src/modules/warehouses/infrastructure/persistence/prisma-warehouse.repository';
import { TenantContextService } from '../../src/common/tenant-context.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { WarehouseCodeAlreadyExistsError } from '../../src/modules/warehouses/application/exceptions/warehouse.exceptions';

describe('PrismaWarehouseRepository', () => {
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let repository: PrismaWarehouseRepository;

  const now = new Date();

  beforeEach(() => {
    prisma = {
      warehouse: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    tenantContext = {
      getTenantId: jest.fn().mockReturnValue('tenant-1'),
    } as unknown as jest.Mocked<TenantContextService>;

    repository = new PrismaWarehouseRepository(prisma, tenantContext);
  });

  it('updates warehouse within tenant scope', async () => {
    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.warehouse.update as jest.Mock).mockResolvedValue({
      id: 'wh-1',
      code: 'W1',
      name: 'Updated',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      tenantId: 'tenant-1',
    });

    const result = await repository.update('wh-1', { name: 'Updated' });

    expect(prisma.warehouse.update).toHaveBeenCalledWith({
      where: { id: 'wh-1', tenantId: 'tenant-1' },
      data: { name: 'Updated' },
    });
    expect(result.name).toBe('Updated');
  });

  it('throws when updating code to an existing one', async () => {
    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'wh-2' });

    await expect(repository.update('wh-1', { code: 'DUP' })).rejects.toThrow(
      WarehouseCodeAlreadyExistsError,
    );

    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { code: 'DUP', tenantId: 'tenant-1', NOT: { id: 'wh-1' } },
    });
    expect(prisma.warehouse.update).not.toHaveBeenCalled();
  });

  it('rejects updating warehouse from another tenant', async () => {
    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.warehouse.update as jest.Mock).mockRejectedValue(new Error('Record to update not found'));

    await expect(repository.update('wh-2', { name: 'Updated' })).rejects.toThrow(
      'Record to update not found',
    );
  });

  it('soft deletes warehouse within tenant scope', async () => {
    (prisma.warehouse.update as jest.Mock).mockResolvedValue({
      id: 'wh-1',
      code: 'W1',
      name: 'Warehouse',
      isActive: false,
      createdAt: now,
      updatedAt: now,
      tenantId: 'tenant-1',
    });

    await repository.delete('wh-1');

    expect(prisma.warehouse.update).toHaveBeenCalledWith({
      where: { id: 'wh-1', tenantId: 'tenant-1' },
      data: { isActive: false },
    });
  });

  it('rejects deleting warehouse from another tenant', async () => {
    (prisma.warehouse.update as jest.Mock).mockRejectedValue(new Error('Record to update not found'));

    await expect(repository.delete('wh-2')).rejects.toThrow('Record to update not found');
  });
});
