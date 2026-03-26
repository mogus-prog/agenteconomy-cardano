import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and, count, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { bounties, disputes } from "../db/schema.js";
import { submitTx } from "../services/blockfrost.js";

// ---------------------------------------------------------------------------
// Placeholder Zod schemas
// ---------------------------------------------------------------------------

const DisputeIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const OracleVerifyBodySchema = z.object({
  bountyId: z.string().uuid(),
  agentAddress: z.string(),
  resultIpfs: z.string(),
  oracleAddress: z.string(),
  signature: z.string(),
});

const OracleQueueQuerySchema = z.object({
  status: z.enum(["pending", "in_progress", "resolved"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const OracleRegisterBodySchema = z.object({
  oracleAddress: z.string(),
  pubKey: z.string(),
  categories: z.array(z.string()).optional(),
  endpoint: z.string().url().optional(),
});

const DisputeListQuerySchema = z.object({
  status: z.enum(["pending", "in_progress", "resolved"]).optional(),
  filedBy: z.string().optional(),
  agentAddress: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const ResolveDisputeBodySchema = z.object({
  oracleAddress: z.string(),
  resolution: z.enum(["poster_wins", "agent_wins", "split"]),
  splitPercentage: z.number().int().min(0).max(100).optional(),
  rationale: z.string().optional(),
  signedTx: z.string(),
});

// ---------------------------------------------------------------------------
// Route type helpers
// ---------------------------------------------------------------------------

type DisputeIdParams = z.infer<typeof DisputeIdParamsSchema>;
type OracleVerifyBody = z.infer<typeof OracleVerifyBodySchema>;
type OracleQueueQuery = z.infer<typeof OracleQueueQuerySchema>;
type OracleRegisterBody = z.infer<typeof OracleRegisterBodySchema>;
type DisputeListQuery = z.infer<typeof DisputeListQuerySchema>;
type ResolveDisputeBody = z.infer<typeof ResolveDisputeBodySchema>;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function oracleRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /v1/oracle/verify — oracle submits a verification result
  // -------------------------------------------------------------------------
  fastify.post<{ Body: OracleVerifyBody }>(
    "/v1/oracle/verify",
    async (
      request: FastifyRequest<{ Body: OracleVerifyBody }>,
      reply: FastifyReply,
    ) => {
      const body = OracleVerifyBodySchema.parse(request.body);

      // TODO: verify oracle signature, build verify-and-pay tx, update bounty status
      void body;
      return reply.status(202).send({
        bountyId: body.bountyId,
        verdict: "pending",
        txHash: null,
        status: "queued",
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/oracle/queue — bounties awaiting oracle verification
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: OracleQueueQuery }>(
    "/v1/oracle/queue",
    async (
      request: FastifyRequest<{ Querystring: OracleQueueQuery }>,
      reply: FastifyReply,
    ) => {
      const query = OracleQueueQuerySchema.parse(request.query);

      const conditions = [
        eq(bounties.verificationType, "oracle"),
        eq(bounties.status, "submitted"),
      ];

      const whereClause = and(...conditions);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(bounties)
          .where(whereClause)
          .orderBy(desc(bounties.submittedAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(bounties)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          rewardLovelace: row.rewardLovelace.toString(),
          rewardTokenAmount: row.rewardTokenAmount?.toString() ?? null,
          bondLovelace: row.bondLovelace.toString(),
          claimWindowMs: row.claimWindowMs.toString(),
          disputeWindowMs: row.disputeWindowMs.toString(),
          deadline: row.deadline.toISOString(),
          createdAt: row.createdAt.toISOString(),
          claimedAt: row.claimedAt?.toISOString() ?? null,
          submittedAt: row.submittedAt?.toISOString() ?? null,
          completedAt: row.completedAt?.toISOString() ?? null,
          updatedAt: row.updatedAt?.toISOString() ?? null,
        })),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/oracle/register — register as an oracle node
  // -------------------------------------------------------------------------
  fastify.post<{ Body: OracleRegisterBody }>(
    "/v1/oracle/register",
    async (
      request: FastifyRequest<{ Body: OracleRegisterBody }>,
      reply: FastifyReply,
    ) => {
      const body = OracleRegisterBodySchema.parse(request.body);

      // TODO: store oracle registration, verify stake / collateral on-chain
      return reply.status(201).send({
        oracleAddress: body.oracleAddress,
        categories: body.categories ?? [],
        registeredAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/disputes — list disputes
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: DisputeListQuery }>(
    "/v1/disputes",
    async (
      request: FastifyRequest<{ Querystring: DisputeListQuery }>,
      reply: FastifyReply,
    ) => {
      const query = DisputeListQuerySchema.parse(request.query);

      const conditions = [];
      if (query.status) conditions.push(eq(disputes.status, query.status));
      if (query.filedBy) conditions.push(eq(disputes.filedBy, query.filedBy));
      if (query.agentAddress) conditions.push(eq(disputes.agentAddress, query.agentAddress));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(disputes)
          .where(whereClause)
          .orderBy(desc(disputes.filedAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(disputes)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          filedAt: row.filedAt?.toISOString() ?? null,
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
        })),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/disputes/:id — dispute detail (must be before /:id/resolve)
  // -------------------------------------------------------------------------
  fastify.get<{ Params: DisputeIdParams }>(
    "/v1/disputes/:id",
    async (
      request: FastifyRequest<{ Params: DisputeIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = DisputeIdParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, id))
        .limit(1);

      const dispute = rows[0];
      if (!dispute) {
        return reply.status(404).send({ error: "Dispute not found" });
      }

      return reply.status(200).send({
        ...dispute,
        filedAt: dispute.filedAt?.toISOString() ?? null,
        resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/disputes/:id/resolve
  // -------------------------------------------------------------------------
  fastify.post<{ Params: DisputeIdParams; Body: ResolveDisputeBody }>(
    "/v1/disputes/:id/resolve",
    async (
      request: FastifyRequest<{ Params: DisputeIdParams; Body: ResolveDisputeBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = DisputeIdParamsSchema.parse(request.params);
      const body = ResolveDisputeBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      await db
        .update(disputes)
        .set({
          resolution: body.resolution,
          splitPercentage: body.splitPercentage,
          resolutionTxHash: txHash,
          status: "resolved",
          resolvedAt: new Date(),
        })
        .where(eq(disputes.id, id));

      // Also update the bounty's status
      const disputeRows = await db
        .select({ bountyId: disputes.bountyId })
        .from(disputes)
        .where(eq(disputes.id, id))
        .limit(1);

      const dispute = disputeRows[0];
      if (dispute) {
        const bountyStatus = body.resolution === "agent_wins" ? "completed" : "cancelled";
        await db
          .update(bounties)
          .set({
            status: bountyStatus,
            updatedAt: new Date(),
          })
          .where(eq(bounties.id, dispute.bountyId));
      }

      return reply.status(202).send({
        disputeId: id,
        resolution: body.resolution,
        splitPercentage: body.splitPercentage ?? null,
        txHash,
        status: "submitted",
      });
    },
  );
}
