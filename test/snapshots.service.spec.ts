import { KpiType } from '@prisma/client';
import { SnapshotsService } from '../src/modules/snapshots/snapshots.service';
import { PaginationService } from '../src/common/pagination/pagination.service';

describe('SnapshotsService', () => {
  const prisma: any = {
    inventory: { groupBy: jest.fn() },
    location: { findMany: jest.fn() },
    inventorySnapshot: { createMany: jest.fn() },
    kpiSnapshot: { create: jest.fn() },
  };
  const kpisService: any = { getSummary: jest.fn() };
  const pagination = new PaginationService();
  let service: SnapshotsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SnapshotsService(prisma, kpisService, pagination);
  });

  it('generates inventory snapshots using aggregated inventory', async () => {
    prisma.inventory.groupBy.mockResolvedValue([
      { productId: 'p1', batchId: null, locationId: 'l1', uom: 'EA', _sum: { quantity: 10 } },
    ]);
    prisma.location.findMany.mockResolvedValue([{ id: 'l1', warehouseId: 'w1' }]);
    prisma.inventorySnapshot.createMany.mockResolvedValue({ count: 1 });

    const result = await service.generateInventorySnapshotForTenant('t1', new Date('2024-01-01'));

    expect(prisma.inventorySnapshot.createMany).toHaveBeenCalled();
    expect(result[0].warehouseId).toBe('w1');
    expect(result[0].quantity.toString()).toBe('10');
  });

  it('generates KPI snapshots using KPI service summary', async () => {
    kpisService.getSummary.mockResolvedValue({
      service: { fillRate: 0.9, otif: 0.8 },
      inventory: { inventoryTurnover: 1.1, averageInventoryQty: 2.2, daysOfSupply: 3.3 },
      picking: { linesPerHour: 4, unitsPerHour: 5, pickingAccuracy: 0.95 },
    });
    const snapshot = { id: 'k1' };
    prisma.kpiSnapshot.create.mockResolvedValue(snapshot);

    const result = await service.generateKpiSnapshotForTenant(
      't1',
      KpiType?.DAILY ?? ('DAILY' as any),
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      'w1',
    );

    expect(prisma.kpiSnapshot.create).toHaveBeenCalled();
    expect(result).toBe(snapshot);
  });
});
