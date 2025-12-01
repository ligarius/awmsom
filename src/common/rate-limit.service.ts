import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface RateWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly windows = new Map<string, RateWindow>();
  private readonly limit = 60;
  private readonly windowMs = 60 * 1000;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), this.windowMs);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  private cleanupExpired(now = Date.now()) {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
  }

  check(key: string) {
    const now = Date.now();
    this.cleanupExpired(now);
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
