import { RateLimitService } from '../../src/common/rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    service = new RateLimitService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('evicts expired windows before checking limits', () => {
    const now = Date.now();
    const windows = (service as any).windows as Map<string, { count: number; resetAt: number }>;

    windows.set('expired', { count: 5, resetAt: now - 1 });
    windows.set('active', { count: 1, resetAt: now + 1 });

    const response = service.check('active');

    expect(response.allowed).toBe(true);
    expect(windows.has('expired')).toBe(false);
    expect(windows.get('active')?.count).toBe(2);
  });

  it('periodically cleans up expired windows to avoid memory growth', () => {
    const now = Date.now();
    const windows = (service as any).windows as Map<string, { count: number; resetAt: number }>;
    const windowMs = (service as any).windowMs as number;

    for (let i = 0; i < 100; i += 1) {
      windows.set(`expired-${i}`, { count: 1, resetAt: now - windowMs - i });
    }

    expect(windows.size).toBe(100);

    jest.advanceTimersByTime(windowMs + 1);

    expect(windows.size).toBe(0);
  });
});
