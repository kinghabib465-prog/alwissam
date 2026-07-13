import { cacheGet, cacheSet } from "@/lib/db/redis";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const cacheKey = `rl:${params.key}`;

  try {
    const cached = await cacheGet<Bucket>(cacheKey);
    const bucket = cached && cached.resetAt > now
      ? cached
      : { count: 0, resetAt: now + params.windowMs };

    if (bucket.count >= params.limit) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    const ttl = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    await cacheSet(cacheKey, bucket, ttl);
    return {
      allowed: true,
      remaining: Math.max(0, params.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  } catch {
    const existing = memory.get(params.key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + params.windowMs };

    if (bucket.count >= params.limit) {
      memory.set(params.key, bucket);
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    memory.set(params.key, bucket);
    return {
      allowed: true,
      remaining: Math.max(0, params.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}
