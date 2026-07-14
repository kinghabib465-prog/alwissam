import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

/**
 * Redis اختياري.
 * على منصات الرفع اترك REDIS_URL فارغًا إن لم توفر Upstash/Redis،
 * وسيعمل التخزين المؤقت وتحديد المعدل في الذاكرة فقط.
 */
function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) {
    return globalForRedis.redis;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    globalForRedis.redis = null;
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3_000,
  });

  client.on("error", () => {
    // تجنّب إغراق السجلات عند غياب Redis على المنصة
  });

  globalForRedis.redis = client;
  return client;
}

export const redis = {
  get status() {
    return getRedis()?.status ?? "end";
  },
};

async function ensureConnected(client: Redis) {
  if (client.status === "ready") return true;
  try {
    if (
      client.status === "wait" ||
      client.status === "end" ||
      client.status === "close"
    ) {
      await client.connect();
    }
    return (client.status as string) === "ready";
  } catch {
    return false;
  }
}

export async function publishEvent(channel: string, payload: unknown) {
  const client = getRedis();
  if (!client) return;
  try {
    if (!(await ensureConnected(client))) return;
    await client.publish(channel, JSON.stringify(payload));
  } catch {
    // Redis اختياري — البيانات تبقى في قاعدة البيانات
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    if (!(await ensureConnected(client))) return null;
    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  const client = getRedis();
  if (!client) return;
  try {
    if (!(await ensureConnected(client))) return;
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // تجاهل فشل الكاش
  }
}
