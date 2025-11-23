import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, ZoneType } from '@prisma/client';
import { InventoryOptimizationService } from '../../src/modules/inventory/inventory-optimization.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('InventoryOptimizationService', () => {
  let service: InventoryOptimizationService;
  let prisma: any;
  let tenantContext: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      warehouse: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
      inventory: { findMany: jest.fn(), groupBy: jest.fn(), count: jest.fn() },
      location: { findMany: jest.fn() },
    };

    tenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1') };
    configService = {
      getWarehouseZones: jest.fn(),
      resolveInventoryPolicy: jest.fn(),
    };

    service = new InventoryOptimizationService(prisma as any, tenantContext as any, configService as any);
  });

  it('builds slotting rules based on velocity and existing inventory', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.inventory.findMany.mockResolvedValue([
      { locationId: 'loc-1', quantity: decimal(5), location: { zone: 'PICK', warehouseId: 'wh-1' } },
      { locationId: 'loc-2', quantity: decimal(2), location: { zone: 'RSV', warehouseId: 'wh-1' } },
    ]);
    configService.getWarehouseZones.mockResolvedValue([
      { code: 'PICK', allowPicking: true, allowStorage: true, zoneType: ZoneType.PICKING },
      { code: 'RSV', allowPicking: false, allowStorage: true, zoneType: ZoneType.RESERVE },
    ]);
    configService.resolveInventoryPolicy.mockResolvedValue({ maxInventoryVariance: 0.1 });

    const rule = await service.generateSlottingRules({ warehouseId: 'wh-1', productId: 'prod-1', velocity: 'FAST' });

    expect(rule.recommendedZone).toBe('PICK');
    expect(rule.preferredLocations).toEqual(expect.arrayContaining(['loc-1']));
    expect(rule.varianceGuardrail).toBe(0.1);
    expect(configService.getWarehouseZones).toHaveBeenCalled();
  });

  it('suggests relocations when distribution is uneven', async () => {
    prisma.inventory.findMany.mockResolvedValue([
      { locationId: 'loc-1', quantity: decimal(10), productId: 'prod-1', location: { warehouseId: 'wh-1' } },
      { locationId: 'loc-2', quantity: decimal(1), productId: 'prod-1', location: { warehouseId: 'wh-1' } },
    ]);

    const suggestions = await service.suggestRelocations({ warehouseId: 'wh-1', productId: 'prod-1' });

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].fromLocationId).toBe('loc-1');
    expect(suggestions[0].toLocationId).toBe('loc-2');
  });

  it('plans warehouse balance validating availability and capacity', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
    prisma.warehouse.findFirst.mockResolvedValueOnce({ id: 'wh-1' }).mockResolvedValueOnce({ id: 'wh-2' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.inventory.findMany.mockResolvedValue([
      { locationId: 'loc-1', quantity: decimal(8), location: { warehouseId: 'wh-1' } },
      { locationId: 'loc-2', quantity: decimal(4), location: { warehouseId: 'wh-1' } },
    ]);
    prisma.location.findMany.mockResolvedValue([{ id: 'target-1', zone: 'RSV', isActive: true, warehouseId: 'wh-2' }]);
    configService.getWarehouseZones.mockResolvedValue([
      { code: 'RSV', allowStorage: true, allowPicking: false, zoneType: ZoneType.RESERVE },
    ]);
    prisma.inventory.count.mockResolvedValue(0);

    const plan = await service.planWarehouseBalance({
      productId: 'prod-1',
      sourceWarehouseId: 'wh-1',
      targetWarehouseId: 'wh-2',
      quantity: 5,
      uom: 'PCS',
      respectCapacity: true,
    });

    expect(plan.toLocationId).toBe('target-1');
    expect(plan.quantity).toBe(5);
    expect(plan.validations.availableAtSource).toBe(12);
  });

  it('throws when source has insufficient inventory', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
    prisma.warehouse.findFirst.mockResolvedValueOnce({ id: 'wh-1' }).mockResolvedValueOnce({ id: 'wh-2' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.inventory.findMany.mockResolvedValue([{ locationId: 'loc-1', quantity: decimal(1), location: { warehouseId: 'wh-1' } }]);

    await expect(
      service.planWarehouseBalance({
        productId: 'prod-1',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        quantity: 5,
        uom: 'PCS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when warehouses are missing', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(
      service.generateSlottingRules({ warehouseId: 'missing', productId: 'prod-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
