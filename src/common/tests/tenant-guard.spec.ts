import { ExecutionContext, ForbiddenException } from '@nestjs/common';
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
});
