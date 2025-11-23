import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

describe('LocationsService', () => {
  let prisma: {
    warehouse: { findFirst: jest.Mock };
    location: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let tenantContext: { getTenantId: jest.Mock };
  let service: LocationsService;

  beforeEach(() => {
    prisma = {
      warehouse: { findFirst: jest.fn() },
      location: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    tenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1') };
    service = new LocationsService(prisma as unknown as PrismaService, tenantContext as unknown as TenantContextService);
  });

  it('creates a location when warehouse belongs to tenant and code is unique', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', tenantId: 'tenant-1' });
    prisma.location.findFirst.mockResolvedValueOnce(null);
    prisma.location.create.mockResolvedValue({
      id: 'loc-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      code: 'LOC-1',
      description: null,
      zone: 'DEFAULT',
    });

    const result = await service.create({ warehouseId: 'wh-1', code: 'LOC-1' });

    expect(result).toMatchObject({ id: 'loc-1', code: 'LOC-1', tenantId: 'tenant-1', warehouseId: 'wh-1' });
    expect(prisma.location.create).toHaveBeenCalledWith({
      data: {
        warehouseId: 'wh-1',
        code: 'LOC-1',
        description: undefined,
        tenantId: 'tenant-1',
        zone: 'DEFAULT',
      },
    });
  });

  it('throws when warehouse does not belong to tenant', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.create({ warehouseId: 'wh-x', code: 'LOC-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws conflict when code already exists in warehouse for tenant', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', tenantId: 'tenant-1' });
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });

    await expect(service.create({ warehouseId: 'wh-1', code: 'LOC-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when location is missing', async () => {
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates location ensuring ownership and uniqueness', async () => {
    const existing = {
      id: 'loc-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      code: 'LOC-1',
      description: 'old',
      zone: 'DEFAULT',
    };
    prisma.location.findFirst
      .mockResolvedValueOnce(existing) // fetch existing
      .mockResolvedValueOnce(null); // uniqueness check
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-2', tenantId: 'tenant-1' });
    prisma.location.update.mockResolvedValue({ ...existing, warehouseId: 'wh-2', description: 'new' });

    const result = await service.update('loc-1', { warehouseId: 'wh-2', description: 'new' });

    expect(result.warehouseId).toBe('wh-2');
    expect(result.description).toBe('new');
    expect(prisma.location.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: { warehouseId: 'wh-2', code: 'LOC-1', description: 'new' },
    });
  });

  it('removes location when it exists', async () => {
    const existing = { id: 'loc-1', tenantId: 'tenant-1' };
    prisma.location.findFirst.mockResolvedValue(existing);
    prisma.location.delete.mockResolvedValue(existing);

    const result = await service.remove('loc-1');

    expect(result).toEqual(existing);
    expect(prisma.location.delete).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
  });
});
