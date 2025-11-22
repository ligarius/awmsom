import { AuthService } from '../auth.service';
import { TenantsService } from '../../tenants/tenants.service';
import { UsersService } from '../../users/users.service';

class MockPrismaService {
  private id = 1;
  tenants: any[] = [];
  users: any[] = [];
  private nextId() {
    return `id-${this.id++}`;
  }

  tenant = {
    create: ({ data }: any) => {
      const record = { id: this.nextId(), isActive: true, ...data };
      this.tenants.push(record);
      return record;
    },
    findUnique: ({ where }: any) => this.tenants.find((t) => t.id === where.id) ?? null,
  };

  user = {
    findFirst: ({ where }: any) => {
      return this.users.find((u) => u.tenantId === where.tenantId && u.email === where.email) ?? null;
    },
    findUnique: ({ where }: any) => {
      const key = where.tenantId_email;
      return this.users.find((u) => u.tenantId === key.tenantId && u.email === key.email) ?? null;
    },
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.users.push(record);
      return record;
    },
  };
}

describe('Auth multi-tenant payload', () => {
  it('embeds tenantId in token payload', async () => {
    const prisma = new MockPrismaService();
    const tenantsService = new TenantsService(prisma as any);
    const usersService = new UsersService(prisma as any);
    const authService = new AuthService(prisma as any);

    const tenant = await tenantsService.create({ name: 'Tenant', code: 'T', plan: 'pro' });
    await usersService.createUser({ email: 'user@example.com', password: 'secret', tenantId: tenant.id });

    const result = await authService.login({ email: 'user@example.com', password: 'secret', tenantId: tenant.id });
    const decoded = JSON.parse(Buffer.from(result.access_token, 'base64').toString());

    expect(decoded.tenantId).toBe(tenant.id);
    expect(result.payload.tenantId).toBe(tenant.id);
  });
});
