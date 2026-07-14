import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function isLocalDatabase(connectionString: string) {
  return /localhost|127\.0\.0\.1|@postgres:/.test(connectionString);
}

function isServerlessRuntime() {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME
  );
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const local = isLocalDatabase(connectionString);
  const forceSsl = process.env.DATABASE_SSL === "true";
  const disableSsl = process.env.DATABASE_SSL === "false";
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

  const max = Number(
    process.env.DB_POOL_MAX || (isServerlessRuntime() ? 1 : 10),
  );

  const config: PoolConfig = {
    connectionString,
    max: Number.isFinite(max) && max > 0 ? max : 1,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  };

  if (!disableSsl && (forceSsl || !local)) {
    config.ssl = { rejectUnauthorized };
  }

  return config;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.pgPool ?? new Pool(buildPoolConfig(connectionString));

  // مهم للمنصات بلا خادم: إعادة استخدام الـ pool بين الطلبات الدافئة
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = (globalForPrisma.prisma ??= createPrismaClient());
      const value = Reflect.get(client, prop, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });

export default prisma;
