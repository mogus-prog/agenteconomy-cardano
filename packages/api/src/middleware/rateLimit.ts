import type { FastifyRequest, FastifyReply } from "fastify";
import { redis } from "../lib/redis.js";
import { config } from "../config.js";

function getClientId(request: FastifyRequest): string {
  const apiKey = request.headers["x-api-key"];
  if (apiKey && typeof apiKey === "string") return `ratelimit:${apiKey}`;
  return `ratelimit:${request.ip}`;
}

export function createRateLimiter(maxRpm: number = config.DEFAULT_RATE_LIMIT_RPM) {
  return async function rateLimit(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const key = getClientId(request);
    const now = Date.now();
    const windowMs = 60_000;
    const windowStart = now - windowMs;

    try {
      // Use Redis pipeline for atomic sliding window
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart); // remove expired entries
      pipeline.zcard(key); // count current entries
      pipeline.zadd(key, String(now), `${now}:${Math.random()}`); // add this request
      pipeline.pexpire(key, windowMs); // auto-expire the whole key

      const results = await pipeline.exec();

      // results[1] is the ZCARD result: [error, count]
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      if (currentCount >= maxRpm) {
        // Remove the ZADD we just did since request is rejected
        await redis.zremrangebyscore(key, Number(now), Number(now) + 1);

        const retryAfter = Math.ceil(windowMs / 1000);
        reply.header("X-RateLimit-Limit", String(maxRpm));
        reply.header("X-RateLimit-Remaining", "0");
        reply.header("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
        reply.header("Retry-After", String(retryAfter));
        reply.code(429).send({ error: "Rate limit exceeded", retryAfter });
        return;
      }

      reply.header("X-RateLimit-Limit", String(maxRpm));
      reply.header("X-RateLimit-Remaining", String(Math.max(0, maxRpm - currentCount - 1)));
      reply.header("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
    } catch {
      // Fail open - if Redis is down, allow the request
      reply.header("X-RateLimit-Limit", String(maxRpm));
      reply.header("X-RateLimit-Remaining", String(maxRpm));
    }
  };
}

export const defaultRateLimit = createRateLimiter();
export const txRateLimit = createRateLimiter(config.TX_RATE_LIMIT_RPM);
