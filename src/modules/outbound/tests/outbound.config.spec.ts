import { BadRequestException } from '@nestjs/common';
import { OutboundService } from '../outbound.service';

class MockPrismaService {
  tenantId = 'tenant-1';
  outboundOrders: any[] = [];
  outboundLines: any[] = [];
  inventories: any[] = [];

  outboundOrder = {
    findFirst: ({ where }: any) =>
      this.outboundOrders.find((o) => o.id === where.id && o.tenantId === where.tenantId) ?? null,
    update: ({ where, data }: any) => {
      const order = this.outboundOrders.find((o) => o.id === where.id);
      Object.assign(order, data);
      return order;
    },
  };

  outboundOrderLine = {
    update: ({ where, data }: any) => {
      const line = this.outboundLines.find((l) => l.id === where.id);
      Object.assign(line, data);
      return line;
    },
    findMany: ({ where }: any) =>
      this.outboundLines.filter((l) => l.outboundOrderId === where.outboundOrderId && l.tenantId === where.tenantId),
  };

  inventory = {
    findMany: ({ where }: any) =>
      this.inventories.filter(
        (inv) =>
          inv.productId === where.productId &&
          inv.stockStatus === where.stockStatus &&
          inv.location.warehouseId === where.location.warehouseId,
      ),
    update: ({ where, data }: any) => {
      const inv = this.inventories.find((i) => i.id === where.id);
      Object.assign(inv, data);
      return inv;
    },
    findFirst: ({ where }: any) =>
      this.inventories.find(
        (inv) =>
          inv.productId === where.productId &&
          inv.batchId === where.batchId &&
          inv.locationId === where.locationId &&
          inv.stockStatus === where.stockStatus,
      ) ?? null,
    create: ({ data }: any) => {
      const record = { id: `inv-${this.inventories.length + 1}`, location: { warehouseId: data.locationId }, ...data };
      this.inventories.push(record);
      return record;
    },
  };

  $transaction = async (cb: any) => cb(this);
}

describe('OutboundService with outbound rules', () => {
  let prisma: MockPrismaService;
  let service: OutboundService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    const tenantContext = { getTenantId: () => 'tenant-1' } as any;
    const configService = {
      getOutboundRule: jest.fn().mockResolvedValue({ enforceFullAllocation: true }),
      getPickingMethods: jest.fn().mockResolvedValue([]),
    } as any;

    const order = {
      id: 'order-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      status: 'DRAFT',
      lines: [
        {
          id: 'line-1',
          tenantId: 'tenant-1',
          outboundOrderId: 'order-1',
          productId: 'prod-1',
          requestedQty: 10,
          allocatedQty: 0,
          product: { requiresExpiryDate: false },
        },
      ],
    };

    prisma.outboundOrders.push(order);
    prisma.outboundLines.push(order.lines[0]);
    prisma.inventories.push({
      id: 'inv-1',
      productId: 'prod-1',
      quantity: 5,
      tenantId: 'tenant-1',
      stockStatus: 'AVAILABLE',
      uom: 'EA',
      batchId: null,
      locationId: 'loc-1',
      location: { warehouseId: 'wh-1' },
    });

    service = new OutboundService(prisma as any, tenantContext, configService);
  });

  it('throws when full allocation is required but not possible', async () => {
    await expect(service.releaseOutboundOrder('order-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
