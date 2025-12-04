import { ApiKeysService } from '../src/modules/api-keys/api-keys.service';
import { AuditService } from '../src/modules/audit/audit.service';
import * as bcrypt from 'bcryptjs';

describe('ApiKeysService', () => {
  const prisma: any = {
    apiKey: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { recordLog: jest.fn() } as any as AuditService;
  const service = new ApiKeysService(prisma as any, audit);
  const testSalt = bcrypt.genSaltSync(4);
  let saltSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    saltSpy = jest.spyOn(bcrypt, 'genSalt').mockResolvedValue(testSalt);
  });

  afterEach(() => {
    saltSpy?.mockRestore();
    jest.restoreAllMocks();
  });

  it('creates api key', async () => {
    const generatedKey = 'generated-key';
    const generateSpy = jest.spyOn(service as any, 'generateApiKey').mockReturnValue(generatedKey);
    prisma.apiKey.create.mockImplementation(async ({ data }) => ({ id: '1', ...data }));
    const result = await service.createApiKey('t1', 'u1', { name: 'test' });
    expect(result).toMatchObject({ id: '1', tenantId: 't1', name: 'test', key: generatedKey });
    expect(result).not.toHaveProperty('keyHash');
    expect(prisma.apiKey.create).toHaveBeenCalled();
    generateSpy.mockRestore();
  });

  it('validates api key', async () => {
    const storedHash = await bcrypt.hash('abc', testSalt);
    prisma.apiKey.findMany.mockResolvedValue([
      { id: '1', tenantId: 't1', keyHash: storedHash, isActive: true, canRead: true, canWrite: false },
    ]);
    const validation = await service.validateApiKey('abc');
    expect(validation?.tenantId).toBe('t1');
    expect(validation?.apiKey).not.toHaveProperty('keyHash');
  });

  it('revokes api key', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({ id: '1', tenantId: 't1' });
    prisma.apiKey.update.mockResolvedValue({ id: '1', isActive: false, keyHash: 'hash' });
    const result = await service.revokeApiKey('t1', '1');
    expect(result.isActive).toBe(false);
    expect(result).not.toHaveProperty('keyHash');
  });
});
