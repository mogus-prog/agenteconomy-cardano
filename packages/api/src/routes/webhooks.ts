import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { webhooks } from "../db/schema.js";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const VALID_EVENTS = [
  "bounty:new",
  "bounty:claimed",
  "bounty:submitted",
  "bounty:completed",
  "bounty:disputed",
  "bounty:refunded",
  "bounty:cancelled",
] as const;

const RegisterWebhookBodySchema = z.object({
  agentAddress: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
  secret: z.string().min(16).optional(),
});

const ListWebhooksQuerySchema = z.object({
  agentAddress: z.string().min(1),
});

const WebhookIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type RegisterWebhookBody = z.infer<typeof RegisterWebhookBodySchema>;
type ListWebhooksQuery = z.infer<typeof ListWebhooksQuerySchema>;
type WebhookIdParams = z.infer<typeof WebhookIdParamsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeWebhook(row: typeof webhooks.$inferSelect) {
  return {
    id: row.id,
    agentAddress: row.agentAddress,
    url: row.url,
    events: row.events,
    isActive: row.isActive,
    failureCount: row.failureCount,
    createdAt: row.createdAt?.toISOString() ?? null,
    lastTriggeredAt: row.lastTriggeredAt?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /v1/webhooks — Register a webhook
  // -------------------------------------------------------------------------
  fastify.post<{ Body: RegisterWebhookBody }>(
    "/v1/webhooks",
    async (
      request: FastifyRequest<{ Body: RegisterWebhookBody }>,
      reply: FastifyReply,
    ) => {
      const body = RegisterWebhookBodySchema.parse(request.body);

      const secret = body.secret ?? crypto.randomBytes(32).toString("hex");

      const inserted = await db
        .insert(webhooks)
        .values({
          agentAddress: body.agentAddress,
          url: body.url,
          events: [...body.events],
          secret,
        })
        .returning();

      const webhook = inserted[0];
      if (!webhook) {
        return reply.status(500).send({ error: "Failed to create webhook" });
      }

      return reply.status(201).send({
        id: webhook.id,
        agentAddress: webhook.agentAddress,
        url: webhook.url,
        events: webhook.events,
        secret,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/webhooks — List webhooks for an agent
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ListWebhooksQuery }>(
    "/v1/webhooks",
    async (
      request: FastifyRequest<{ Querystring: ListWebhooksQuery }>,
      reply: FastifyReply,
    ) => {
      const query = ListWebhooksQuerySchema.parse(request.query);

      const rows = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.agentAddress, query.agentAddress));

      return reply.status(200).send({
        data: rows.map(serializeWebhook),
      });
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /v1/webhooks/:id — Remove a webhook
  // -------------------------------------------------------------------------
  fastify.delete<{ Params: WebhookIdParams }>(
    "/v1/webhooks/:id",
    async (
      request: FastifyRequest<{ Params: WebhookIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = WebhookIdParamsSchema.parse(request.params);

      const deleted = await db
        .delete(webhooks)
        .where(eq(webhooks.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      return reply.status(200).send({ id, deleted: true });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/webhooks/:id/test — Send a test event
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WebhookIdParams }>(
    "/v1/webhooks/:id/test",
    async (
      request: FastifyRequest<{ Params: WebhookIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = WebhookIdParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, id))
        .limit(1);

      const webhook = rows[0];
      if (!webhook) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      const testPayload = {
        event: "test",
        payload: {
          message: "This is a test webhook event from AgentEconomy",
          webhookId: id,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const body = JSON.stringify(testPayload);
      const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(body)
        .digest("hex");

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AgentEconomy-Signature": signature,
            "X-AgentEconomy-Event": "test",
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        return reply.status(200).send({
          id,
          testResult: {
            statusCode: response.status,
            success: response.ok,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return reply.status(200).send({
          id,
          testResult: {
            statusCode: null,
            success: false,
            error: message,
          },
        });
      }
    },
  );
}
