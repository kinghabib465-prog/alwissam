import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("Redis disabled");
    return null;
  }

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
  if (!redis) return;

  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    await redis.publish(channel, JSON.stringify(payload));
  } catch {}
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

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

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 60
) {
  if (!redis) return;

  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }

    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {}
}
