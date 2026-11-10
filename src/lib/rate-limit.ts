import { Ratelimit } from '@upstash/ratelimit';
import { redis, isRedisConfigured } from './redis';

type LimitResult = {
  success: boolean;
};

type RateLimiter = {
  limit(identifier: string): Promise<LimitResult>;
};

declare global {
  var __financeosRateLimitStore: Map<string, number[]> | undefined;
}

const localRateLimitStore =
  globalThis.__financeosRateLimitStore ??= new Map<string, number[]>();

function createLocalSlidingWindowLimiter(
  prefix: string,
  maxRequests: number,
  windowMs: number
): RateLimiter {
  return {
    async limit(identifier: string) {
      const now = Date.now();
      const key = `${prefix}:${identifier}`;
      const attempts =
        localRateLimitStore.get(key)?.filter((timestamp) => now - timestamp < windowMs) ?? [];

      const success = attempts.length < maxRequests;
      if (success) {
        attempts.push(now);
      }

      localRateLimitStore.set(key, attempts);
      return { success };
    },
  };
}

function createSlidingWindowLimiter(
  prefix: string,
  maxRequests: number,
  window: `${number} ${'s' | 'm' | 'h'}`
): RateLimiter {
  if (isRedisConfigured) {
    return new Ratelimit({
      redis: redis as never,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      prefix,
    });
  }

  const [amount, unit] = window.split(' ') as [string, 's' | 'm' | 'h'];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000 };

  return createLocalSlidingWindowLimiter(
    prefix,
    maxRequests,
    Number(amount) * multipliers[unit]
  );
}

// LimiterGenérico - 100 requisições a cada 10 segundos
export const ratelimit = createSlidingWindowLimiter(
  '@upstash/ratelimit',
  100,
  '10 s'
);

// Auth Limiters específicos
export const ratelimitLogin = createSlidingWindowLimiter(
  '@upstash/ratelimit/login',
  5,
  '15 m'
);

export const ratelimitSignup = createSlidingWindowLimiter(
  '@upstash/ratelimit/signup',
  3,
  '1 h'
);

export const ratelimitPasswordReset = createSlidingWindowLimiter(
  '@upstash/ratelimit/password_reset',
  3,
  '1 h'
);
