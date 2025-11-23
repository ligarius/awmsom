import { ApiKeysService } from '../src/modules/api-keys/api-keys.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('ApiKeysService', () => {
  const prisma: any = {
    apiKey: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { recordLog: jest.fn() } as any as AuditService;
  const service = new ApiKeysService(prisma as any, audit);

  beforeEach(() => jest.clearAllMocks());

  it('creates api key', async () => {
    prisma.apiKey.create.mockResolvedValue({ id: '1', tenantId: 't1', name: 'test' });
    const result = await service.createApiKey('t1', 'u1', { name: 'test' });
    expect(result).toEqual({ id: '1', tenantId: 't1', name: 'test' });
    expect(prisma.apiKey.create).toHaveBeenCalled();
  });

  it('validates api key', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({ id: '1', tenantId: 't1', key: 'abc', isActive: true, canRead: true, canWrite: false });
    const validation = await service.validateApiKey('abc');
    expect(validation?.tenantId).toBe('t1');
  });

  it('revokes api key', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({ id: '1', tenantId: 't1' });
    prisma.apiKey.update.mockResolvedValue({ id: '1', isActive: false });
    const result = await service.revokeApiKey('t1', '1');
    expect(result.isActive).toBe(false);
  });
});
