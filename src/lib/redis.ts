import { Redis } from '@upstash/redis';

type RedisLike = Pick<Redis, 'get' | 'set' | 'keys' | 'incr' | 'expire'>;

type MemoryEntry = {
  expiresAt: number | null;
  value: unknown;
};

const PLACEHOLDER_PREFIXES = ['your_upstash_redis_', 'dummy_'];

const normalizeEnv = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const isPlaceholder = (value?: string) =>
  !value || PLACEHOLDER_PREFIXES.some((prefix) => value.startsWith(prefix));

const redisUrl = normalizeEnv(process.env.UPSTASH_REDIS_REST_URL);
const redisToken = normalizeEnv(process.env.UPSTASH_REDIS_REST_TOKEN);

export const isRedisConfigured = Boolean(
  redisUrl &&
    redisToken &&
    redisUrl.startsWith('https://') &&
    !isPlaceholder(redisUrl) &&
    !isPlaceholder(redisToken)
);

declare global {
  var __financeosRedisStore: Map<string, MemoryEntry> | undefined;
  var __financeosRedisWarningShown: boolean | undefined;
}

class InMemoryRedis implements RedisLike {
  private readonly store =
    globalThis.__financeosRedisStore ??= new Map<string, MemoryEntry>();

  private deleteIfExpired(key: string) {
    const entry = this.store.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }

  private pruneExpired() {
    for (const key of this.store.keys()) {
      this.deleteIfExpired(key);
    }
  }

  async get<TData>(key: string): Promise<TData | null> {
    this.deleteIfExpired(key);
    return (this.store.get(key)?.value as TData | undefined) ?? null;
  }

  async set<TData>(key: string, value: TData, opts?: { ex?: number }): Promise<TData | "OK" | null> {
    this.store.set(key, {
      value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
    });
    return 'OK';
  }

  async keys(pattern: string) {
    this.pruneExpired();

    const regex = new RegExp(
      `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`
    );

    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  async incr(key: string) {
    this.deleteIfExpired(key);

    const currentEntry = this.store.get(key);
    const currentValue =
      typeof currentEntry?.value === 'number' ? currentEntry.value : Number(currentEntry?.value ?? 0);
    const nextValue = currentValue + 1;

    this.store.set(key, {
      value: nextValue,
      expiresAt: currentEntry?.expiresAt ?? null,
    });

    return nextValue;
  }

  async expire(key: string, seconds: number) {
    this.deleteIfExpired(key);

    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    this.store.set(key, {
      ...entry,
      expiresAt: Date.now() + seconds * 1000,
    });

    return 1;
  }
}

if (!isRedisConfigured && !globalThis.__financeosRedisWarningShown) {
  console.warn(
    '[Redis] Upstash nao configurado. Usando fallback em memoria para desenvolvimento local.'
  );
  globalThis.__financeosRedisWarningShown = true;
}

export const redis: RedisLike = isRedisConfigured
  ? new Redis({
      url: redisUrl!,
      token: redisToken!,
    })
  : new InMemoryRedis();
