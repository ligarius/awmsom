import { AuthService } from '../auth.service';
import * as jwt from 'jsonwebtoken';

class MockPrismaService {
  private id = 1;
  tenants: any[] = [];
  users: any[] = [];
  userRole = { findMany: () => [] };

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
      if (where.id) {
        return this.users.find((u) => u.id === where.id) ?? null;
      }
      const key = where.tenantId_email;
      return this.users.find((u) => u.tenantId === key.tenantId && u.email === key.email) ?? null;
    },
    create: ({ data }: any) => {
      const record = { id: this.nextId(), ...data };
      this.users.push(record);
      return record;
    },
    update: ({ where, data }: any) => {
      const user = this.users.find((u) => u.id === where.id);
      if (!user) {
        return null;
      }
      Object.assign(user, data);
      return user;
    },
  };
}

describe('Auth module', () => {
  let prisma: MockPrismaService;
  let authService: AuthService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    authService = new AuthService(prisma as any);
  });

  it('registers users with hashed passwords and prevents duplicates per tenant', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T1', plan: 'pro' } });

    const user = await authService.register({
      email: 'user@example.com',
      password: 'supersecret',
      tenantId: tenant.id,
    });

    expect(user.id).toBeDefined();
    expect(prisma.users[0].passwordHash).not.toBe('supersecret');

    await expect(
      authService.register({ email: 'user@example.com', password: 'supersecret', tenantId: tenant.id }),
    ).rejects.toThrow('User already exists');
  });

  it('embeds tenantId in signed JWT payload during login', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T2', plan: 'pro' } });
    await authService.register({
      email: 'user@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    });

    const result = await authService.login({ email: 'user@example.com', password: 'secret123', tenantId: tenant.id });
    const decoded = jwt.verify(result.access_token, 'defaultSecret') as any;

    expect(decoded.tenantId).toBe(tenant.id);
    expect(result.payload.tenantId).toBe(tenant.id);
    expect(decoded.sub).toBe(result.payload.sub);
  });

  it('rejects login for inactive tenants or users', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T3', plan: 'pro', isActive: false } });

    await expect(
      authService.login({ email: 'ghost@example.com', password: 'secret', tenantId: tenant.id }),
    ).rejects.toThrow('Tenant inactive');

    const activeTenant = prisma.tenant.create({ data: { name: 'Tenant 2', code: 'T4', plan: 'pro' } });
    const user = await authService.register({
      email: 'user2@example.com',
      password: 'secret123',
      tenantId: activeTenant.id,
    });

    await authService.updateCredentials(user.id, { isActive: false });

    await expect(
      authService.login({ email: 'user2@example.com', password: 'secret123', tenantId: activeTenant.id }),
    ).rejects.toThrow('User inactive');
  });

  it('finds users by tenant and email and updates credentials', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T5', plan: 'pro' } });
    const user = await authService.register({
      email: 'lookup@example.com',
      password: 'secret123',
      tenantId: tenant.id,
    });

    const found = await authService.findUser(tenant.id, 'lookup@example.com');
    expect(found.email).toBe('lookup@example.com');
    expect(found).not.toHaveProperty('passwordHash');

    const updated = await authService.updateCredentials(user.id, { password: 'newpassword', isActive: true });
    expect(updated.isActive).toBe(true);
    expect(prisma.users[0].passwordHash).not.toBe('newpassword');
  });
});
