import { TraceabilityService } from '../../src/modules/traceability/traceability.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { PaginationService } from '../../src/common/pagination/pagination.service';

describe('TraceabilityService', () => {
  let prisma: any;
  let service: TraceabilityService;

  beforeEach(() => {
    prisma = {
      batch: { findFirst: jest.fn() },
      inboundReceiptLine: { findMany: jest.fn() },
      movementLine: { findMany: jest.fn() },
      outboundOrderLine: { findMany: jest.fn() },
      handlingUnitLine: { findMany: jest.fn() },
      product: { findFirst: jest.fn() },
      customer: { findFirst: jest.fn() },
      shipment: { findMany: jest.fn() },
      inboundReceipt: { findMany: jest.fn() },
      inventory: { findMany: jest.fn() },
    } as unknown as PrismaService;

    service = new TraceabilityService(
      prisma,
      new CacheService({ get: jest.fn(), set: jest.fn(), del: jest.fn() } as any),
      new PaginationService(),
    );
  });

  it('builds batch trace with inbound, movements and outbound elements', async () => {
    (prisma.batch.findFirst as jest.Mock).mockResolvedValue({
      id: 'batch1',
      tenantId: 't1',
      productId: 'prod1',
      code: 'B-1',
      batchCode: 'B-1',
      product: { name: 'Product 1' },
    });
    (prisma.inboundReceiptLine.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'irl1',
        productId: 'prod1',
        receivedQty: 10,
        uom: 'EA',
        inboundReceiptId: 'rec1',
        inboundReceipt: { id: 'rec1', externalRef: 'REC-1', receivedAt: new Date('2024-01-02'), createdAt: new Date('2024-01-01'), warehouseId: 'wh1' },
      },
    ]);
    (prisma.movementLine.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mov1',
        movementHeaderId: 'mh1',
        fromLocationId: 'A',
        toLocationId: 'B',
        quantity: 5,
        uom: 'EA',
        movementHeader: { id: 'mh1', createdAt: new Date('2024-01-03'), warehouseId: 'wh1' },
      },
    ]);
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ool1',
        outboundOrderId: 'oo1',
        outboundOrder: { externalRef: 'EXT-1', customerId: 'c1', customer: { name: 'ACME', code: 'AC' }, requestedShipDate: new Date('2024-01-04') },
        productId: 'prod1',
        requestedQty: 8,
        pickedQty: 7,
        pickingTaskLines: [{ batchId: 'batch1' }],
      },
    ]);
    (prisma.handlingUnitLine.findMany as jest.Mock).mockResolvedValue([
      {
        handlingUnitId: 'hu1',
        handlingUnit: {
          code: 'HU-1',
          shipments: [
            { shipment: { id: 'sh1', status: 'DISPATCHED', scheduledDeparture: new Date('2024-01-05'), actualDeparture: new Date('2024-01-05'), vehicleRef: 'TRUCK-1' } },
          ],
        },
        outboundOrder: { id: 'oo1' },
      },
    ]);

    const result = await service.getBatchTrace('t1', { batchCode: 'B-1' });

    expect(result.batch.code).toBe('B-1');
    expect(result.inbound.receipts[0].lines).toHaveLength(1);
    expect(result.internalMovements[0].movementId).toBe('mh1');
    expect(result.outbound.orders[0].outboundOrderId).toBe('oo1');
    expect(result.outbound.shipments[0].shipmentId).toBe('sh1');
  });

  it('returns shipments grouped by customer within range', async () => {
    (prisma.customer.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', code: 'AC', name: 'ACME' });
    (prisma.shipment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 's1',
        actualDeparture: new Date('2024-02-02'),
        shipmentHandlingUnits: [
          {
            outboundOrderId: 'o1',
            outboundOrder: {
              externalRef: 'EXT-2',
              requestedShipDate: new Date('2024-02-02'),
              lines: [
                {
                  productId: 'p1',
                  product: { name: 'Prod' },
                  pickingTaskLines: [{ batch: { code: 'B-2' } }],
                  pickedQty: 4,
                  uom: 'EA',
                },
              ],
            },
          },
        ],
      },
    ]);

    const result = await service.getCustomerShipmentsTrace('t1', {
      customerId: 'c1',
      fromDate: '2024-02-01',
      toDate: '2024-02-03',
    });

    expect(result.customer.code).toBe('AC');
    expect(result.shipments[0].outboundOrders[0].lines[0].batchCode).toBe('B-2');
  });

  it('returns product history separated by flows', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'p1', name: 'Prod', sku: 'SKU' });
    (prisma.inboundReceiptLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'in1', receivedQty: 5, uom: 'EA', batchCode: 'B1', inboundReceiptId: 'rec1', batch: null },
    ]);
    (prisma.outboundOrderLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'out1', pickedQty: 3, uom: 'EA', outboundOrderId: 'o1', pickingTaskLines: [{ batch: { code: 'B1' } }] },
    ]);
    (prisma.movementLine.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mov1',
        quantity: 2,
        uom: 'EA',
        batchCode: 'B1',
        movementHeader: { movementType: 'INTERNAL_TRANSFER' },
        fromLocationId: 'L1',
        toLocationId: 'L2',
      },
    ]);
    (prisma.inventory.findMany as jest.Mock).mockResolvedValue([
      { id: 'inv1', quantity: 4, uom: 'EA', batch: { code: 'B1' }, locationId: 'LOC1' },
    ]);

    const history = await service.getProductHistory('t1', {
      productId: 'p1',
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      batchCode: 'B1',
    });

    expect(history.inbound).toHaveLength(1);
    expect(history.outbound[0].batchCode).toBe('B1');
    expect(history.movements[0].movementType).toBe('INTERNAL_TRANSFER');
    expect(history.inventorySnapshots[0].batchCode).toBe('B1');
  });
});
