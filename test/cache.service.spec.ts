import { CacheService } from '../src/common/cache/cache.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';

describe('CacheService', () => {
  let cache: CacheService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;
    cache = new CacheService(redis);
  });

  it('should set and get JSON payloads', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));

    await cache.setJson('key', { foo: 'bar' }, 30);
    expect(redis.set).toHaveBeenCalledWith('key', JSON.stringify({ foo: 'bar' }), 30);

    const value = await cache.getJson<{ foo: string }>('key');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('builds cache keys with namespaces', () => {
    expect(cache.buildKey('ns', ['t1', null, 'p1'])).toBe('ns:t1:ALL:p1');
  });
});
