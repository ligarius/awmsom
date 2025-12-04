import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TenantGuard } from '../../guards/tenant.guard';

class MockPrismaService {
  tenants: any[] = [];
  tenant = {
    findUnique: ({ where }: any) => this.tenants.find((t) => t.id === where.id) ?? null,
  };
}

const mockExecutionContext = (request: any): ExecutionContext => {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
};

describe('TenantGuard', () => {
  const jwtSecret = 'averysecurejwtsecretwithmorethan32characters!!';

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('blocks requests without tenant', async () => {
    const prisma = new MockPrismaService();
    const guard = new TenantGuard(prisma as any);
    await expect(guard.canActivate(mockExecutionContext({ path: '/warehouses' })) ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks inactive tenants', async () => {
    const prisma = new MockPrismaService();
    prisma.tenants.push({ id: 't1', isActive: false });
    const guard = new TenantGuard(prisma as any);
    await expect(
      guard.canActivate(mockExecutionContext({ path: '/warehouses', user: { tenantId: 't1' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows active tenants', async () => {
    const prisma = new MockPrismaService();
    prisma.tenants.push({ id: 't1', isActive: true });
    const guard = new TenantGuard(prisma as any);
    await expect(guard.canActivate(mockExecutionContext({ path: '/warehouses', user: { tenantId: 't1' } }))).resolves.toBe(true);
  });

  it('reads signed JWT from cookies', async () => {
    const prisma = new MockPrismaService();
    prisma.tenants.push({ id: 't1', isActive: true });
    const guard = new TenantGuard(prisma as any);

    const token = jwt.sign({ sub: 'user-1', tenantId: 't1' }, jwtSecret);

    const request = {
      path: '/warehouses',
      headers: { cookie: `awms_token=${token}` },
      cookies: {},
    };

    await expect(guard.canActivate(mockExecutionContext(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'user-1', tenantId: 't1' });
  });

  it('rejects unsigned bearer tokens', async () => {
    const prisma = new MockPrismaService();
    prisma.tenants.push({ id: 't1', isActive: true });
    const guard = new TenantGuard(prisma as any);

    const fakeToken = Buffer.from(JSON.stringify({ sub: 'user-1', tenantId: 't1' }), 'utf8').toString('base64');
    const request = {
      path: '/warehouses',
      headers: { authorization: `Bearer ${fakeToken}` },
      cookies: {},
    };

    await expect(guard.canActivate(mockExecutionContext(request))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
