import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sql } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { db } from "../db/index.js";

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /health
   * Liveness probe — returns 200 as long as the process is running.
   */
  fastify.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /ready
   * Readiness probe — verifies DB and Redis connectivity before returning 200.
   */
  fastify.get("/ready", async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: { db: string; redis: string } = {
      db: "unknown",
      redis: "unknown",
    };

    // DB check
    try {
      await db.execute(sql`SELECT 1`);
      checks.db = "ok";
    } catch {
      checks.db = "error";
    }

    // Redis check
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }

    const allHealthy = checks.db === "ok" && checks.redis === "ok";

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? "ready" : "not_ready",
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
