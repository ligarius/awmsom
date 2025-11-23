import { Injectable } from '@nestjs/common';

interface RateWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly windows = new Map<string, RateWindow>();
  private readonly limit = 60;
  private readonly windowMs = 60 * 1000;

  check(key: string) {
    const now = Date.now();
    const existing = this.windows.get(key);
    if (!existing || existing.resetAt < now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, resetAt: now + this.windowMs };
    }

    if (existing.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { allowed: true, remaining: this.limit - existing.count, resetAt: existing.resetAt };
  }
}
