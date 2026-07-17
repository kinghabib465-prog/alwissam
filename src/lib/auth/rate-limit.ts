import { cacheGet, cacheSet } from "@/lib/db/redis";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

function memoryLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  increment?: boolean;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const increment = params.increment !== false;
  const existing = memory.get(params.key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + params.windowMs };

  if (bucket.count >= params.limit) {
    memory.set(params.key, bucket);
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  if (increment) {
    bucket.count += 1;
    memory.set(params.key, bucket);
  } else {
    memory.set(params.key, bucket);
  }

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  /** عند false يتحقق فقط دون احتساب محاولة (مفيد لنجاح الدخول) */
  increment?: boolean;
}): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const increment = params.increment !== false;
  const cacheKey = `rl:${params.key}`;
  const hasRedis = !!process.env.REDIS_URL?.trim();

  if (!hasRedis) {
    return memoryLimit({ ...params, increment });
  }

  try {
    const cached = await cacheGet<Bucket>(cacheKey);
    const bucket =
      cached && cached.resetAt > now
        ? cached
        : { count: 0, resetAt: now + params.windowMs };

    if (bucket.count >= params.limit) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }

    if (increment) {
      bucket.count += 1;
      const ttl = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      await cacheSet(cacheKey, bucket, ttl);
    }

    return {
      allowed: true,
      remaining: Math.max(0, params.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  } catch {
    return memoryLimit({ ...params, increment });
  }
}
