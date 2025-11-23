import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ApiKeyGuard } from '../src/auth/api-key.guard';

const mockService = {
  validateApiKey: jest.fn(),
};

describe('ApiKeyGuard', () => {
  const guard = new ApiKeyGuard(mockService as any);

  beforeEach(() => jest.clearAllMocks());

  it('allows valid key', async () => {
    const req: any = { headers: { 'x-api-key': 'valid' } };
    mockService.validateApiKey.mockResolvedValue({ tenantId: 't1', apiKey: { canRead: true, canWrite: false } });
    const ctx = new ExecutionContextHost([req]);
    const result = await guard.canActivate(ctx as any);
    expect(result).toBe(true);
    expect(req.user.tenantId).toBe('t1');
  });

  it('rejects invalid key', async () => {
    const req: any = { headers: { 'x-api-key': 'bad' } };
    mockService.validateApiKey.mockResolvedValue(null);
    const ctx = new ExecutionContextHost([req]);
    await expect(guard.canActivate(ctx as any)).rejects.toThrow();
  });
});
