import { Redis } from "ioredis";
import { config } from "../config.js";

// Create Redis client - lazy connection, reconnects automatically
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on("error", (err: Error) => {
  console.error("[redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] Connected");
});

// Helper: get with JSON parse
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

// Helper: set with JSON stringify + TTL
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // fail silently - cache is best-effort
  }
}

// Helper: delete cache key
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // fail silently
  }
}
