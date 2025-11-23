import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async setJson(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  buildKey(namespace: string, parts: (string | number | undefined | null)[]): string {
    const normalizedParts = parts.map((p) => (p === undefined || p === null ? 'ALL' : String(p)));
    return [namespace, ...normalizedParts].join(':');
  }
}
