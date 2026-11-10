import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL?.replace(/^"|"$/g, "") ??
    process.env.DIRECT_URL?.replace(/^"|"$/g, "");

  if (!connectionString) {
    // Return a PrismaClient that will fail on first query
    // This allows the app to start without a DB connection (e.g., during build)
    console.warn(
      "⚠️  DATABASE_URL not set. Prisma will fail on first query."
    );
  }

  let poolConfig: PoolConfig = { connectionString };

  if (connectionString) {
    try {
      const host = new URL(connectionString).hostname;
      const isSupabaseHost =
        host.endsWith(".supabase.co") || host.endsWith(".pooler.supabase.com");
      const isDirectSupabaseHost =
        host.startsWith("db.") && host.endsWith(".supabase.co");

      if (isDirectSupabaseHost) {
        console.warn(
          "⚠️  Prisma esta usando o host direto do Supabase (db.*.supabase.co). Em redes sem IPv6 isso pode causar ENETUNREACH. Prefira a URL do pooler em DATABASE_URL."
        );
      }

      poolConfig = {
        connectionString,
        // Environments without IPv6 often fail against Supabase direct hosts
        // with ENETUNREACH. Prefer IPv4 when available.
        // @ts-expect-error - 'family' is passed correctly to underlying socket but missing in latest @types/pg
        family: 4,
        connectionTimeoutMillis: 10_000,
        ...(isSupabaseHost
          ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
          : {}),
      };
    } catch {
      poolConfig = { connectionString };
    }
  }

  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
