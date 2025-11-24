import { Prisma, SlottingStatus } from '@prisma/client';
import { SlottingService } from '../../src/modules/slotting/slotting.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('SlottingService', () => {
  let prisma: any;
  let cache: any;
  let audit: any;
  let service: SlottingService;

  beforeEach(() => {
    prisma = {
      slottingConfig: { findFirst: jest.fn() },
      location: { findMany: jest.fn() },
      locationCompatibilityRule: { findMany: jest.fn() },
      inventory: { findMany: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      product: { findMany: jest.fn() },
      movementLine: { aggregate: jest.fn(), findMany: jest.fn() },
      outboundOrderLine: { aggregate: jest.fn(), findMany: jest.fn() },
      slottingRecommendation: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      movementHeader: { create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    cache = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      buildKey: jest.fn((ns: string, parts: any[]) => `${ns}:${parts.join(':')}`),
    };
    audit = { recordLog: jest.fn() };
    service = new SlottingService(prisma as any, cache as any, audit as any);
  });

  it('calculates ABC classes based on cumulative thresholds', () => {
    const classes = (service as any).calculateAbc({ p1: 80, p2: 15, p3: 5 });
    expect(classes.p1).toBe('A');
    expect(classes.p2).toBe('B');
    expect(classes.p3).toBe('C');
  });

  it('calculates XYZ classes using variability', () => {
    const classes = (service as any).calculateXyz({
      p1: [10, 10, 10],
      p2: [10, 2, 18],
      p3: [20, 0, 0],
    });
    expect(classes.p1).toBe('X');
    expect(classes.p2).toBe('Y');
    expect(classes.p3).toBe('Z');
  });

  it('adds bonuses for golden zones on location scoring', () => {
    const score = (service as any).evaluateLocationScore(
      { id: 'p1' },
      10,
      { id: 'l1', zone: 'PICK' },
      { l1: 0 },
      { heavyProductsZone: true, fragileProductsZone: true },
      1,
      true,
    );
    expect(score).toBeGreaterThan(13);
  });

  it('enforces compatibility rules', () => {
    const blocked = (service as any).evaluateCompatibility(
      { id: 'p1' },
      { id: 'l1' },
      [{ locationId: 'l1', ruleType: 'BLOCK', productId: 'p1' }],
    );
    expect(blocked.allowed).toBe(false);

    const allowed = (service as any).evaluateCompatibility(
      { id: 'p1' },
      { id: 'l1' },
      [{ locationId: 'l1', ruleType: 'ALLOW', productId: 'p1' }],
    );
    expect(allowed.allowed).toBe(true);
    expect(allowed.bonus).toBeGreaterThan(0);
  });

  it('creates slotting recommendations with best scoring location', async () => {
    prisma.slottingConfig.findFirst.mockResolvedValue({
      abcPeriodDays: 30,
      xyzPeriodDays: 30,
      goldenZoneLocations: 1,
      heavyProductsZone: true,
      fragileProductsZone: true,
      isActive: true,
    });
    prisma.location.findMany.mockResolvedValue([
      { id: 'loc-golden', code: 'A01', zone: 'PICK', isActive: true },
      { id: 'loc-2', code: 'B01', zone: 'RESERVE', isActive: true },
    ]);
    prisma.locationCompatibilityRule.findMany.mockResolvedValue([]);
    prisma.inventory.findMany.mockResolvedValue([
      { productId: 'prod-1', quantity: decimal(100), locationId: 'loc-golden', location: { warehouseId: 'wh-1' } },
    ]);
    prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', defaultUom: 'EA' }]);
    prisma.movementLine.aggregate.mockResolvedValue({ _sum: { quantity: decimal(90) } });
    prisma.outboundOrderLine.aggregate.mockResolvedValue({ _sum: { pickedQty: decimal(0) } });
    prisma.movementLine.findMany.mockResolvedValue([]);
    prisma.outboundOrderLine.findMany.mockResolvedValue([]);
    prisma.slottingRecommendation.create.mockImplementation(async ({ data }: any) => ({ id: 'rec-1', ...data }));

    const recs = await service.calculateSlotting('tenant-1', {
      warehouseId: 'wh-1',
      limitResults: 5,
      force: true,
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].recommendedLocationId).toBe('loc-golden');
  });

  it('executes recommendation and updates status', async () => {
    prisma.slottingRecommendation.findFirst.mockResolvedValue({
      id: 'rec-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      productId: 'prod-1',
      currentLocationId: 'loc-1',
      recommendedLocationId: 'loc-2',
      status: SlottingStatus.APPROVED,
      product: { id: 'prod-1', defaultUom: 'EA' },
    });
    prisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: decimal(10) } });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.inventory.findFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: decimal(10) });
    prisma.inventory.findFirst.mockResolvedValueOnce(null);
    prisma.slottingRecommendation.update.mockResolvedValue({ id: 'rec-1', status: SlottingStatus.EXECUTED });

    const res = await service.executeRecommendation('tenant-1', 'rec-1');

    expect(res.status).toBe(SlottingStatus.EXECUTED);
    expect(prisma.slottingRecommendation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: SlottingStatus.EXECUTED } }),
    );
  });
});
