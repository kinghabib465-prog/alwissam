import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function publishEvent(channel: string, payload: unknown) {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    await redis.publish(channel, JSON.stringify(payload));
  } catch {
    // Redis is optional for degraded mode; callers should still persist to DB
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore cache failures
  }
}
