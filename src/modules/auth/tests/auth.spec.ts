import { AuthService } from '../auth.service';
import { UserAccountService } from '../../users/user-account.service';
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
    findMany: ({ where }: any) => {
      return this.users.filter((u) => u.tenantId === where.tenantId);
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
    delete: ({ where }: any) => {
      const idx = this.users.findIndex((u) => u.id === where.id);
      if (idx === -1) {
        return null;
      }
      const [deleted] = this.users.splice(idx, 1);
      return deleted;
    },
  };
}

describe('Auth module', () => {
  let prisma: MockPrismaService;
  let authService: AuthService;
  let userAccountService: UserAccountService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    userAccountService = new UserAccountService(prisma as any);
    authService = new AuthService(prisma as any, undefined as any, userAccountService as any);
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

  it('rejects registrations without a usable password', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T11', plan: 'pro' } });

    await expect(
      authService.register({ email: 'nopass@example.com', password: '', tenantId: tenant.id }),
    ).rejects.toThrow('Password is required');

    await expect(
      authService.register({ email: 'spaces@example.com', password: '   ', tenantId: tenant.id }),
    ).rejects.toThrow('Password is required');
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

  it('lists users by tenant with active tenant validation', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T6', plan: 'pro' } });
    const inactiveTenant = prisma.tenant.create({
      data: { name: 'Inactive', code: 'T7', plan: 'pro', isActive: false },
    });

    await authService.register({ email: 'one@example.com', password: 'pw', tenantId: tenant.id });
    await authService.register({ email: 'two@example.com', password: 'pw', tenantId: tenant.id });

    const users = await authService.listUsers(tenant.id);
    expect(users).toHaveLength(2);
    expect(users.every((u: any) => !('passwordHash' in u))).toBe(true);

    await expect(authService.listUsers(inactiveTenant.id)).rejects.toThrow('Tenant inactive');
  });

  it('deactivates a user and prevents double deactivation', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T8', plan: 'pro' } });
    const user = await authService.register({ email: 'deact@example.com', password: 'pw', tenantId: tenant.id });

    const result = await authService.deactivateUser(user.id);
    expect(result.isActive).toBe(false);
    expect(prisma.users.find((u) => u.id === user.id)?.isActive).toBe(false);

    await expect(authService.deactivateUser(user.id)).rejects.toThrow('User already inactive');
  });

  it('deletes an active user only when tenant is active', async () => {
    const tenant = prisma.tenant.create({ data: { name: 'Tenant', code: 'T9', plan: 'pro' } });
    const inactiveTenant = prisma.tenant.create({
      data: { name: 'Inactive', code: 'T10', plan: 'pro', isActive: false },
    });
    const activeUser = await authService.register({ email: 'active@example.com', password: 'pw', tenantId: tenant.id });
    const inactiveUser = prisma.user.create({
      data: { email: 'inactive@example.com', passwordHash: 'pw', tenantId: inactiveTenant.id, isActive: true },
    });

    const deleted = await authService.deleteUser(activeUser.id);
    expect(deleted.id).toBe(activeUser.id);
    expect(prisma.users.find((u) => u.id === activeUser.id)).toBeUndefined();

    await expect(authService.deleteUser(inactiveUser.id)).rejects.toThrow('Tenant inactive');
    await authService.deactivateUser(inactiveUser.id).catch(() => undefined);
    await expect(authService.deleteUser(inactiveUser.id)).rejects.toThrow('Tenant inactive');

    await expect(authService.deleteUser('missing')).rejects.toThrow('User not found');
  });
});
