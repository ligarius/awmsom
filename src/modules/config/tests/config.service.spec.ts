import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '../config.service';

class MockPrismaService {
  private id = 1;
  tenantConfigs: any[] = [];
  pickingMethods: any[] = [];
  zones: any[] = [];
  warehouses: any[] = [];
  products: any[] = [];
  inventoryPolicies: any[] = [];
  outboundRules: any[] = [];

  private nextId() {
    return `id-${this.id++}`;
  }

  tenantConfig = {
    findFirst: ({ where }: any) => this.tenantConfigs.find((c) => c.tenantId === where.tenantId) ?? null,
    create: ({ data }: any) => {
      const record = {
        id: this.nextId(),
        allowNegativeStock: false,
        enableCycleCounting: true,
        ...data,
      };
      this.tenantConfigs.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const record = this.tenantConfigs.find((c) => c.id === where.id);
      Object.assign(record, data);
      return record;
    },
  };

  pickingMethodConfig = {
    findMany: ({ where }: any) =>
      this.pickingMethods.filter(
        (m) => m.tenantId === where.tenantId && (where.warehouseId === undefined || m.warehouseId === where.warehouseId),
      ),
    findFirst: ({ where }: any) =>
      this.pickingMethods.find(
        (m) =>
          m.tenantId === where.tenantId &&
          m.warehouseId === where.warehouseId &&
          m.method === where.method,
      ) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.pickingMethods.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const record = this.pickingMethods.find((m) => m.id === where.id);
      Object.assign(record, data);
      return record;
    },
    updateMany: ({ where, data }: any) => {
      this.pickingMethods
        .filter((m) => m.tenantId === where.tenantId && m.warehouseId === where.warehouseId)
        .forEach((m) => Object.assign(m, data));
    },
  };

  warehouseZoneConfig = {
    findFirst: ({ where }: any) => this.zones.find((z) => z.id === where.id && z.tenantId === where.tenantId) ?? null,
    findMany: ({ where }: any) =>
      this.zones.filter((z) => z.tenantId === where.tenantId && z.warehouseId === where.warehouseId),
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.zones.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const record = this.zones.find((z) => z.id === where.id);
      Object.assign(record, data);
      return record;
    },
  };

  inventoryPolicy = {
    findMany: ({ where }: any) =>
      this.inventoryPolicies.filter(
        (p) =>
          p.tenantId === where.tenantId &&
          (where.warehouseId === undefined || p.warehouseId === where.warehouseId) &&
          (where.productId === undefined || p.productId === where.productId),
      ),
    findFirst: ({ where }: any) =>
      this.inventoryPolicies.find(
        (p) =>
          (where.id ? p.id === where.id : true) &&
          p.tenantId === where.tenantId &&
          (where.warehouseId === undefined || p.warehouseId === where.warehouseId) &&
          (where.productId === undefined || p.productId === where.productId),
      ) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.inventoryPolicies.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const record = this.inventoryPolicies.find((p) => p.id === where.id);
      Object.assign(record, data);
      return record;
    },
  };

  outboundRule = {
    findFirst: ({ where }: any) =>
      this.outboundRules.find(
        (r) =>
          r.tenantId === where.tenantId &&
          (where.id ? r.id === where.id : true) &&
          (where.warehouseId === undefined ? true : r.warehouseId === where.warehouseId),
      ) ?? null,
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.outboundRules.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const record = this.outboundRules.find((r) => r.id === where.id);
      Object.assign(record, data);
      return record;
    },
  };

  warehouse = {
    findFirst: ({ where }: any) =>
      this.warehouses.find((w) => w.id === where.id && w.tenantId === where.tenantId) ?? null,
  };

  product = {
    findFirst: ({ where }: any) => this.products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
  };
}

describe('ConfigService', () => {
  let prisma: MockPrismaService;
  let service: ConfigService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.warehouses.push({ id: 'wh-1', tenantId: 'tenant-1' });
    prisma.products.push({ id: 'prod-1', tenantId: 'tenant-1' });
    prisma.warehouses.push({ id: 'wh-2', tenantId: 'tenant-2' });
    service = new ConfigService(prisma as any);
  });

  it('creates default tenant config when missing', async () => {
    const created = await service.getTenantConfig('tenant-1');
    expect(created.id).toBeDefined();
    expect(created.tenantId).toBe('tenant-1');

    const fetched = await service.getTenantConfig('tenant-1');
    expect(prisma.tenantConfigs).toHaveLength(1);
    expect(fetched.id).toBe(created.id);
  });

  it('upserts picking methods and resets defaults', async () => {
    await service.upsertPickingMethod('tenant-1', { method: 'ORDER' as any, isDefault: true });
    await service.upsertPickingMethod('tenant-1', { method: 'BATCH' as any, isDefault: true });

    const methods = await service.getPickingMethods('tenant-1');
    const orderMethod = methods.find((m: any) => m.method === 'ORDER');
    const batchMethod = methods.find((m: any) => m.method === 'BATCH');
    expect(orderMethod?.isDefault).toBe(false);
    expect(batchMethod?.isDefault).toBe(true);
  });

  it('rejects zones created for warehouses of another tenant', async () => {
    await expect(
      service.upsertWarehouseZone('tenant-1', {
        warehouseId: 'wh-2',
        code: 'Z1',
        name: 'Zone',
        zoneType: 'PICKING' as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
