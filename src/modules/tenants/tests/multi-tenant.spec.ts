import { BadRequestException } from '@nestjs/common';
import { TenantsService } from '../tenants.service';
import { UsersService } from '../../users/users.service';
import { PrismaWarehouseRepository } from '../../warehouses/infrastructure/persistence/prisma-warehouse.repository';
import { LocationsService } from '../../locations/locations.service';

class MockPrismaService {
  private id = 1;
  tenants: any[] = [];
  users: any[] = [];
  warehouses: any[] = [];
  locations: any[] = [];

  private nextId() {
    return `id-${this.id++}`;
  }

  tenant = {
    create: ({ data }: any) => {
      const record = { id: this.nextId(), isActive: true, ...data };
      this.tenants.push(record);
      return record;
    },
    findMany: () => this.tenants,
    findUnique: ({ where }: any) =>
      this.tenants.find((t) => t.id === where.id || t.code === where.code) ?? null,
    update: ({ where, data }: any) => {
      const tenant = this.tenants.find((t) => t.id === where.id);
      Object.assign(tenant, data);
      return tenant;
    },
  };

  user = {
    findFirst: ({ where }: any) => {
      return this.users.find((u) => u.email === where.email && u.tenantId === where.tenantId) ?? null;
    },
    findUnique: ({ where }: any) => {
      const key = where.tenantId_email;
      if (!key) return null;
      return this.users.find((u) => u.email === key.email && u.tenantId === key.tenantId) ?? null;
    },
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.users.push(record);
      return record;
    },
  };

  warehouse = {
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
      this.warehouses.push(record);
      return record;
    },
    findFirst: ({ where }: any) =>
      this.warehouses.find(
        (w) =>
          (where.id ? w.id === where.id : true) &&
          (where.tenantId ? w.tenantId === where.tenantId : true) &&
          (where.code ? w.code === where.code : true),
      ) ?? null,
    findMany: ({ where, skip, take }: any) => {
      const filtered = this.warehouses.filter(
        (w) => w.tenantId === where.tenantId && (!where.code || w.code.includes(where.code)) && (where.isActive === undefined || w.isActive === where.isActive),
      );
      return filtered.slice(skip, skip + take);
    },
    count: ({ where }: any) => this.warehouses.filter((w) => w.tenantId === where.tenantId).length,
    update: ({ where, data }: any) => {
      const warehouse = this.warehouses.find((w) => w.id === where.id);
      Object.assign(warehouse, data);
      return warehouse;
    },
  };

  location = {
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.locations.push(record);
      return record;
    },
    findMany: ({ where }: any) => this.locations.filter((loc) => loc.tenantId === where.tenantId),
  };

  $transaction = async (operations: any[]) => Promise.all(operations);
}

class StubTenantContextService {
  constructor(private readonly tenantId: string) {}
  getTenantId() {
    return this.tenantId;
  }
}

describe('Multi-tenant flows', () => {
  let prisma: MockPrismaService;
  let tenantsService: TenantsService;
  let usersService: UsersService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    tenantsService = new TenantsService(prisma as any);
    usersService = new UsersService(prisma as any);
  });

  it('creates tenants and isolates warehouses per tenant', async () => {
    const tenantA = await tenantsService.create({ name: 'Tenant A', code: 'A', plan: 'basic' });
    const tenantB = await tenantsService.create({ name: 'Tenant B', code: 'B', plan: 'basic' });

    await usersService.createUser({ email: 'a@example.com', password: 'pwd', tenantId: tenantA.id });
    await usersService.createUser({ email: 'b@example.com', password: 'pwd', tenantId: tenantB.id });

    const repoA = new PrismaWarehouseRepository(prisma as any, new StubTenantContextService(tenantA.id) as any);
    const repoB = new PrismaWarehouseRepository(prisma as any, new StubTenantContextService(tenantB.id) as any);

    await repoA.create({ code: 'WH-A', name: 'Warehouse A', tenantId: tenantA.id });
    await repoB.create({ code: 'WH-B', name: 'Warehouse B', tenantId: tenantB.id });

    const listA = await repoA.list({ page: 1, limit: 10 });
    const listB = await repoB.list({ page: 1, limit: 10 });

    expect(listA.data).toHaveLength(1);
    expect(listB.data).toHaveLength(1);
    expect(listA.data[0].code).toBe('WH-A');
    expect(listB.data[0].code).toBe('WH-B');
  });

  it('blocks cross-tenant resource creation for locations', async () => {
    const tenantA = await tenantsService.create({ name: 'Tenant A', code: 'A', plan: 'basic' });
    const tenantB = await tenantsService.create({ name: 'Tenant B', code: 'B', plan: 'basic' });

    const repoB = new PrismaWarehouseRepository(prisma as any, new StubTenantContextService(tenantB.id) as any);
    const warehouseB = await repoB.create({ code: 'B-1', name: 'Warehouse B1', tenantId: tenantB.id });

    const locationsService = new LocationsService(prisma as any, new StubTenantContextService(tenantA.id) as any);
    await expect(locationsService.create({ warehouseId: warehouseB.id, code: 'LOC-1' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
