import { KpisService } from '../../src/modules/kpis/kpis.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('KpisService', () => {
  let prisma: any;
  let service: KpisService;

  beforeEach(() => {
    prisma = {
      outboundOrderLine: { findMany: jest.fn() },
      shipment: { findMany: jest.fn() },
      inventory: { findMany: jest.fn(), groupBy: jest.fn() },
      location: { count: jest.fn() },
      pickingTask: { findMany: jest.fn() },
      inventoryAdjustment: { findMany: jest.fn() },
    } as unknown as PrismaService;
    service = new KpisService(prisma);

    (prisma.location.count as jest.Mock).mockResolvedValue(0);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('calculates fill rate and otif', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { requestedQty: 10, pickedQty: 8, outboundOrder: {} },
      { requestedQty: 5, pickedQty: 5, outboundOrder: {} },
    ]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([
      {
        actualDeparture: new Date('2024-01-02'),
        warehouseId: 'wh-1',
        shipmentHandlingUnits: [
          {
            outboundOrder: {
              customerId: undefined,
              requestedShipDate: new Date('2024-01-02'),
              lines: [
                { requestedQty: 5, pickedQty: 5, productId: 'p1' },
              ],
            },
          },
        ],
      },
    ]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.location.count as jest.Mock).mockResolvedValue(10);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-31' });

    expect(res.service.fillRate).toBeCloseTo(13 / 15);
    expect(res.service.otif).toBe(1);
    expect(res.service.totalOrders).toBe(1);
    expect(res.capacity.space.totalLocations).toBe(10);
  });

  it('calculates picking productivity and accuracy', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([
      {
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        pickerId: 'op-1',
        lines: [
          { quantityPicked: 5 },
          { quantityPicked: 7 },
        ],
      },
    ]);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([{ id: 'adj1' }]);
    (prisma.location.count as jest.Mock).mockResolvedValue(0);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-02' });

    expect(res.picking.linesPerHour).toBeCloseTo(2);
    expect(res.picking.unitsPerHour).toBeCloseTo(12);
    expect(res.picking.pickingAccuracy).toBe(0.5);
    expect(res.capacity.labor.actualHours).toBeCloseTo(1);
  });

  it('calculates inventory turnover basics', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { requestedQty: 4, pickedQty: 4, outboundOrder: {} },
    ]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([
      { quantity: 10 },
    ]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-05' });

    expect(res.inventory.averageInventoryQty).toBe(5);
    expect(res.inventory.inventoryTurnover).toBeCloseTo(0.8);
    expect(res.inventory.daysOfSupply).toBeGreaterThan(0);
  });

  it('calculates capacity utilization and labor utilization with shift filters', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([{ locationId: 'loc-1' }, { locationId: 'loc-2' }]);
    (prisma.location.count as jest.Mock).mockResolvedValue(4);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([
      {
        startedAt: new Date('2024-01-01T08:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:00Z'),
        pickerId: 'op-1',
        lines: [{ quantityPicked: 3 }],
      },
      {
        startedAt: new Date('2024-01-01T20:00:00Z'),
        completedAt: new Date('2024-01-01T21:00:00Z'),
        pickerId: 'op-2',
        lines: [{ quantityPicked: 2 }],
      },
    ]);

    const res = await service.getSummary('tenant', {
      fromDate: '2024-01-01',
      toDate: '2024-01-02',
      shiftStart: '07:00',
      shiftEnd: '12:00',
    });

    expect(res.capacity.space.utilization).toBeCloseTo(0.5);
    expect(res.capacity.labor.actualHours).toBeCloseTo(2);
    expect(res.capacity.labor.capacityHours).toBeCloseTo(5);
    expect(res.capacity.labor.utilization).toBeCloseTo(0.4);
    expect(res.productivity.workloadByOperator).toHaveLength(1);
  });

  it('aggregates throughput by warehouse', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.location.count as jest.Mock).mockResolvedValue(0);
    (prisma.inventory.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([
      {
        warehouseId: 'wh-1',
        actualDeparture: new Date('2024-01-02'),
        shipmentHandlingUnits: [
          {
            outboundOrder: {
              lines: [
                { pickedQty: 5 },
                { pickedQty: 7 },
              ],
            },
          },
        ],
      },
      {
        warehouseId: 'wh-2',
        actualDeparture: new Date('2024-01-02'),
        shipmentHandlingUnits: [
          {
            outboundOrder: {
              lines: [{ pickedQty: 4 }],
            },
          },
        ],
      },
    ]);

    const res = await service.getSummary('tenant', { fromDate: '2024-01-01', toDate: '2024-01-03' });

    const wh1 = res.productivity.throughputByWarehouse.find((t: any) => t.warehouseId === 'wh-1');
    const wh2 = res.productivity.throughputByWarehouse.find((t: any) => t.warehouseId === 'wh-2');

    expect(wh1).toBeDefined();
    expect(wh1?.shipments).toBe(1);
    expect(wh1?.units).toBe(12);
    expect(wh2).toBeDefined();
    expect(wh2?.shipments).toBe(1);
    expect(wh2?.units).toBe(4);
  });
});
