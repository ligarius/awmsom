import { KpisService } from '../../src/modules/kpis/kpis.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('KpisService', () => {
  let prisma: any;
  let service: KpisService;

  beforeEach(() => {
    prisma = {
      outboundOrderLine: { findMany: jest.fn() },
      shipment: { findMany: jest.fn() },
      inventory: { findMany: jest.fn() },
      pickingTask: { findMany: jest.fn() },
      inventoryAdjustment: { findMany: jest.fn() },
    } as unknown as PrismaService;
    service = new KpisService(prisma);
  });

  it('calculates fill rate and otif', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { requestedQty: 10, pickedQty: 8, outboundOrder: {} },
      { requestedQty: 5, pickedQty: 5, outboundOrder: {} },
    ]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([
      {
        actualDeparture: new Date('2024-01-02'),
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

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-31' });

    expect(res.service.fillRate).toBeCloseTo(13 / 15);
    expect(res.service.otif).toBe(1);
    expect(res.service.totalOrders).toBe(1);
  });

  it('calculates picking productivity and accuracy', async () => {
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pickingTask.findMany as jest.Mock).mockResolvedValue([
      {
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        lines: [
          { quantityPicked: 5 },
          { quantityPicked: 7 },
        ],
      },
    ]);
    (prisma.inventoryAdjustment.findMany as jest.Mock).mockResolvedValue([{ id: 'adj1' }]);

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-02' });

    expect(res.picking.linesPerHour).toBeCloseTo(2);
    expect(res.picking.unitsPerHour).toBeCloseTo(12);
    expect(res.picking.pickingAccuracy).toBe(0.5);
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

    const res = await service.getSummary('t1', { fromDate: '2024-01-01', toDate: '2024-01-05' });

    expect(res.inventory.averageInventoryQty).toBe(5);
    expect(res.inventory.inventoryTurnover).toBeCloseTo(0.8);
    expect(res.inventory.daysOfSupply).toBeGreaterThan(0);
  });
});
