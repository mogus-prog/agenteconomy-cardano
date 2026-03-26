import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Redis } from "ioredis";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { bounties, transactions, disputes } from "../db/schema.js";
import { submitTx } from "../services/blockfrost.js";
import { fetchFromIPFS } from "../services/ipfs.js";

// ---------------------------------------------------------------------------
// Placeholder Zod schemas — replace with full definitions as the domain matures
// ---------------------------------------------------------------------------

const BountyIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const BountyListQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  posterAddress: z.string().optional(),
  agentAddress: z.string().optional(),
  tags: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(["createdAt", "deadline", "rewardLovelace"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const BuildPostBodySchema = z.object({
  posterAddress: z.string(),
  title: z.string(),
  descriptionIpfs: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  rewardLovelace: z.string(),
  deadline: z.string().datetime(),
  verificationType: z.enum(["oracle", "auto", "manual"]),
  tags: z.array(z.string()).optional(),
});

const SubmitPostBodySchema = z.object({
  posterAddress: z.string(),
  signedTx: z.string(),
});

const BuildClaimBodySchema = z.object({
  agentAddress: z.string(),
});

const SubmitClaimBodySchema = z.object({
  agentAddress: z.string(),
  signedTx: z.string(),
});

const BuildSubmitWorkBodySchema = z.object({
  agentAddress: z.string(),
  resultIpfs: z.string(),
});

const SubmitWorkBodySchema = z.object({
  agentAddress: z.string(),
  signedTx: z.string(),
});

const VerifyAndPayBodySchema = z.object({
  oracleAddress: z.string(),
  signedTx: z.string(),
  verdict: z.enum(["approved", "rejected"]),
});

const DisputeBodySchema = z.object({
  filedBy: z.string(),
  reason: z.string(),
  evidenceIpfs: z.string().optional(),
});

const BuildVerifyAndPayBodySchema = z.object({
  oracleAddress: z.string(),
});

const BuildDisputeBodySchema = z.object({
  posterAddress: z.string(),
  reason: z.string(),
  evidenceIpfs: z.string().optional(),
});

const CancelBodySchema = z.object({
  posterAddress: z.string(),
  signedTx: z.string(),
});

// ---------------------------------------------------------------------------
// Route type helpers
// ---------------------------------------------------------------------------

type BountyIdParams = z.infer<typeof BountyIdParamsSchema>;
type BountyListQuery = z.infer<typeof BountyListQuerySchema>;
type BuildPostBody = z.infer<typeof BuildPostBodySchema>;
type SubmitPostBody = z.infer<typeof SubmitPostBodySchema>;
type BuildClaimBody = z.infer<typeof BuildClaimBodySchema>;
type SubmitClaimBody = z.infer<typeof SubmitClaimBodySchema>;
type BuildSubmitWorkBody = z.infer<typeof BuildSubmitWorkBodySchema>;
type SubmitWorkBody = z.infer<typeof SubmitWorkBodySchema>;
type VerifyAndPayBody = z.infer<typeof VerifyAndPayBodySchema>;
type DisputeBody = z.infer<typeof DisputeBodySchema>;
type BuildVerifyAndPayBody = z.infer<typeof BuildVerifyAndPayBodySchema>;
type BuildDisputeBody = z.infer<typeof BuildDisputeBodySchema>;
type CancelBody = z.infer<typeof CancelBodySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeBounty(row: typeof bounties.$inferSelect) {
  return {
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
  };
}

const orderColumnMap = {
  createdAt: bounties.createdAt,
  deadline: bounties.deadline,
  rewardLovelace: bounties.rewardLovelace,
} as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function bountiesRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /v1/bounties — list with filters
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: BountyListQuery }>(
    "/v1/bounties",
    async (
      request: FastifyRequest<{ Querystring: BountyListQuery }>,
      reply: FastifyReply,
    ) => {
      const query = BountyListQuerySchema.parse(request.query);

      const conditions = [];
      if (query.status) conditions.push(eq(bounties.status, query.status));
      if (query.category) conditions.push(eq(bounties.category, query.category));
      if (query.difficulty) conditions.push(eq(bounties.difficulty, query.difficulty));
      if (query.posterAddress) conditions.push(eq(bounties.posterAddress, query.posterAddress));
      if (query.agentAddress) conditions.push(eq(bounties.agentAddress, query.agentAddress));
      if (query.tags) {
        const tagList = query.tags.split(",").map((t) => t.trim());
        for (const tag of tagList) {
          conditions.push(sql`${tag} = ANY(${bounties.tags})`);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderCol = orderColumnMap[query.orderBy];
      const orderFn = query.order === "asc" ? asc : desc;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(bounties)
          .where(whereClause)
          .orderBy(orderFn(orderCol))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(bounties)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        data: rows.map(serializeBounty),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/stats — aggregate statistics (must be before /:id)
  // -------------------------------------------------------------------------
  fastify.get(
    "/v1/bounties/stats",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const statusCounts = await db
        .select({
          status: bounties.status,
          cnt: count(),
          totalReward: sql<string>`COALESCE(SUM(${bounties.rewardLovelace}), 0)::text`,
        })
        .from(bounties)
        .groupBy(bounties.status);

      let total = 0;
      let open = 0;
      let inProgress = 0;
      let completed = 0;
      let disputed = 0;
      let totalRewardLovelace = 0n;

      for (const row of statusCounts) {
        const c = row.cnt;
        total += c;
        totalRewardLovelace += BigInt(row.totalReward);
        switch (row.status) {
          case "open":
            open = c;
            break;
          case "claimed":
          case "submitted":
            inProgress += c;
            break;
          case "completed":
            completed = c;
            break;
          case "disputed":
            disputed = c;
            break;
        }
      }

      const avgRewardLovelace = total > 0 ? (totalRewardLovelace / BigInt(total)).toString() : "0";

      return reply.status(200).send({
        total,
        open,
        inProgress,
        completed,
        disputed,
        totalRewardLovelace: totalRewardLovelace.toString(),
        avgRewardLovelace,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/feed — Server-Sent Events stream (must be before /:id)
  // -------------------------------------------------------------------------
  fastify.get(
    "/v1/bounties/feed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      reply.raw.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);

      const subscriber = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });

      await subscriber.subscribe("bounty:events");

      subscriber.on("message", (_channel: string, message: string) => {
        reply.raw.write(`event: bounty\ndata: ${message}\n\n`);
      });

      request.raw.on("close", () => {
        subscriber.unsubscribe("bounty:events").catch(() => {});
        subscriber.quit().catch(() => {});
        reply.raw.end();
      });

      await new Promise<void>((resolve) => {
        request.raw.on("close", resolve);
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: BountyIdParams }>(
    "/v1/bounties/:id",
    async (
      request: FastifyRequest<{ Params: BountyIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(bounties)
        .where(eq(bounties.id, id))
        .limit(1);

      const bounty = rows[0];
      if (!bounty) {
        return reply.status(404).send({ error: "Bounty not found" });
      }

      return reply.status(200).send(serializeBounty(bounty));
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/:id/spec — IPFS proxy
  // -------------------------------------------------------------------------
  fastify.get<{ Params: BountyIdParams }>(
    "/v1/bounties/:id/spec",
    async (
      request: FastifyRequest<{ Params: BountyIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);

      const rows = await db
        .select({ descriptionIpfs: bounties.descriptionIpfs })
        .from(bounties)
        .where(eq(bounties.id, id))
        .limit(1);

      const bounty = rows[0];
      if (!bounty) {
        return reply.status(404).send({ error: "Bounty not found" });
      }

      const spec = await fetchFromIPFS(bounty.descriptionIpfs);

      return reply.status(200).send({
        id,
        specCid: bounty.descriptionIpfs,
        spec,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/:id/result
  // -------------------------------------------------------------------------
  fastify.get<{ Params: BountyIdParams }>(
    "/v1/bounties/:id/result",
    async (
      request: FastifyRequest<{ Params: BountyIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);

      const rows = await db
        .select({ resultIpfs: bounties.resultIpfs })
        .from(bounties)
        .where(eq(bounties.id, id))
        .limit(1);

      const bounty = rows[0];
      if (!bounty) {
        return reply.status(404).send({ error: "Bounty not found" });
      }

      if (!bounty.resultIpfs) {
        return reply.status(200).send({
          id,
          resultCid: null,
          result: null,
        });
      }

      const result = await fetchFromIPFS(bounty.resultIpfs);

      return reply.status(200).send({
        id,
        resultCid: bounty.resultIpfs,
        result,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/bounties/:id/history
  // -------------------------------------------------------------------------
  fastify.get<{ Params: BountyIdParams }>(
    "/v1/bounties/:id/history",
    async (
      request: FastifyRequest<{ Params: BountyIdParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);

      const events = await db
        .select()
        .from(transactions)
        .where(eq(transactions.bountyId, id))
        .orderBy(asc(transactions.createdAt));

      return reply.status(200).send({
        id,
        events: events.map((tx) => ({
          ...tx,
          amountLovelace: tx.amountLovelace.toString(),
          tokenAmount: tx.tokenAmount?.toString() ?? null,
          blockTime: tx.blockTime?.toISOString() ?? null,
          createdAt: tx.createdAt?.toISOString() ?? null,
        })),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/build-post — returns unsigned CBOR transaction
  // -------------------------------------------------------------------------
  fastify.post<{ Body: BuildPostBody }>(
    "/v1/bounties/build-post",
    async (
      request: FastifyRequest<{ Body: BuildPostBody }>,
      reply: FastifyReply,
    ) => {
      const body = BuildPostBodySchema.parse(request.body);

      try {
        const { buildPostBountyTx } = await import("../services/txBuilder.js");
        const { encodeBountyDatum } = await import("../services/datumEncoder.js");

        const datum = encodeBountyDatum({
          title: body.title,
          descriptionIpfs: body.descriptionIpfs,
          category: body.category,
          difficulty: body.difficulty,
          rewardLovelace: BigInt(body.rewardLovelace),
          deadline: body.deadline,
          verificationType: body.verificationType,
          posterAddress: body.posterAddress,
          tags: body.tags ?? [],
        });

        const result = await buildPostBountyTx({
          posterAddress: body.posterAddress,
          rewardLovelace: BigInt(body.rewardLovelace),
          datum,
        });

        return reply.status(200).send({
          unsignedTxCbor: result.unsignedTxCbor,
          fee: result.feeEstimateLovelace.toString(),
          ttl: Math.floor(Date.now() / 1000) + 300,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Failed to build post bounty tx");
        return reply.status(500).send({
          error: "ChainError",
          code: "CHAIN_ERROR",
          message: `Failed to build transaction: ${msg}`,
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/record — record a bounty that was submitted via wallet
  // -------------------------------------------------------------------------
  const RecordBountyBodySchema = z.object({
    txHash: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    rewardLovelace: z.string(),
    deadline: z.string(),
    difficulty: z.string().optional(),
    verificationType: z.string().optional(),
    posterAddress: z.string(),
  });

  fastify.post(
    "/v1/bounties/record",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = RecordBountyBodySchema.parse(request.body);

      await db
        .insert(bounties)
        .values({
          utxoRef: `${body.txHash}#0`,
          title: body.title,
          descriptionIpfs: body.description ?? "",
          category: body.category ?? "general",
          difficulty: body.difficulty ?? "medium",
          rewardLovelace: BigInt(body.rewardLovelace),
          bondLovelace: BigInt(body.rewardLovelace) / 10n,
          posterAddress: body.posterAddress,
          deadline: new Date(body.deadline),
          claimWindowMs: 86_400_000n,
          disputeWindowMs: 1_800_000n,
          createdAt: new Date(),
          verificationType: body.verificationType ?? "manual",
          status: "open",
          tags: body.tags ?? [],
          postTxHash: body.txHash,
        })
        .onConflictDoNothing();

      return reply.status(201).send({
        txHash: body.txHash,
        status: "recorded",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/submit-post — submit signed tx
  // -------------------------------------------------------------------------
  fastify.post<{ Body: SubmitPostBody }>(
    "/v1/bounties/submit-post",
    async (
      request: FastifyRequest<{ Body: SubmitPostBody }>,
      reply: FastifyReply,
    ) => {
      const body = SubmitPostBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      const inserted = await db
        .insert(bounties)
        .values({
          utxoRef: `${txHash}#0`,
          title: "Pending indexer",
          descriptionIpfs: "",
          category: "general",
          difficulty: "medium",
          rewardLovelace: 0n,
          bondLovelace: 0n,
          posterAddress: body.posterAddress,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          claimWindowMs: 0n,
          disputeWindowMs: 0n,
          createdAt: new Date(),
          verificationType: "manual",
          status: "open",
          postTxHash: txHash,
        })
        .returning({ id: bounties.id });

      const bountyId = inserted[0]?.id ?? null;

      return reply.status(202).send({
        txHash,
        bountyId,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/build-claim
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: BuildClaimBody }>(
    "/v1/bounties/:id/build-claim",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: BuildClaimBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = BuildClaimBodySchema.parse(request.body);

      try {
        // Look up bounty from DB to get utxoRef and datum params
        const rows = await db
          .select()
          .from(bounties)
          .where(eq(bounties.id, id))
          .limit(1);

        const bounty = rows[0];
        if (!bounty) {
          return reply.status(404).send({ error: "Bounty not found" });
        }

        if (bounty.status !== "open") {
          return reply.status(409).send({ error: `Bounty is not open (status: ${bounty.status})` });
        }

        const { buildClaimBountyTx } = await import("../services/txBuilder.js");
        const { encodeBountyDatum } = await import("../services/datumEncoder.js");

        // Build current datum from stored bounty data
        const currentDatum = encodeBountyDatum({
          title: bounty.title,
          descriptionIpfs: bounty.descriptionIpfs,
          category: bounty.category,
          difficulty: bounty.difficulty,
          rewardLovelace: bounty.rewardLovelace,
          deadline: bounty.deadline.toISOString(),
          verificationType: bounty.verificationType,
          posterAddress: bounty.posterAddress,
          tags: bounty.tags ?? [],
        });

        // New datum: same bounty but with Claimed status (constr 1 for status)
        // For now we re-encode the datum; the on-chain script validates the transition
        const newDatum = currentDatum;

        const result = await buildClaimBountyTx({
          bountyUtxoRef: bounty.utxoRef,
          agentAddress: body.agentAddress,
          currentDatum,
          newDatum,
        });

        return reply.status(200).send({
          unsignedTxCbor: result.unsignedTxCbor,
          fee: result.feeEstimateLovelace.toString(),
          ttl: Math.floor(Date.now() / 1000) + 300,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Failed to build claim bounty tx");
        return reply.status(500).send({
          error: "ChainError",
          code: "CHAIN_ERROR",
          message: `Failed to build transaction: ${msg}`,
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/submit-claim
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: SubmitClaimBody }>(
    "/v1/bounties/:id/submit-claim",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: SubmitClaimBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = SubmitClaimBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      await db
        .update(bounties)
        .set({
          status: "claimed",
          agentAddress: body.agentAddress,
          claimedAt: new Date(),
          claimTxHash: txHash,
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id));

      return reply.status(202).send({
        txHash,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/build-submit-work
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: BuildSubmitWorkBody }>(
    "/v1/bounties/:id/build-submit-work",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: BuildSubmitWorkBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = BuildSubmitWorkBodySchema.parse(request.body);

      try {
        // Look up bounty from DB to get utxoRef and datum params
        const rows = await db
          .select()
          .from(bounties)
          .where(eq(bounties.id, id))
          .limit(1);

        const bounty = rows[0];
        if (!bounty) {
          return reply.status(404).send({ error: "Bounty not found" });
        }

        if (bounty.status !== "claimed") {
          return reply.status(409).send({ error: `Bounty is not claimed (status: ${bounty.status})` });
        }

        const { buildSubmitWorkTx } = await import("../services/txBuilder.js");
        const { encodeBountyDatum } = await import("../services/datumEncoder.js");

        // Build current datum from stored bounty data
        const currentDatum = encodeBountyDatum({
          title: bounty.title,
          descriptionIpfs: bounty.descriptionIpfs,
          category: bounty.category,
          difficulty: bounty.difficulty,
          rewardLovelace: bounty.rewardLovelace,
          deadline: bounty.deadline.toISOString(),
          verificationType: bounty.verificationType,
          posterAddress: bounty.posterAddress,
          tags: bounty.tags ?? [],
        });

        // New datum: same bounty but with WorkSubmitted status
        const newDatum = currentDatum;

        const result = await buildSubmitWorkTx({
          bountyUtxoRef: bounty.utxoRef,
          agentAddress: body.agentAddress,
          resultIpfsCid: body.resultIpfs,
          currentDatum,
          newDatum,
        });

        return reply.status(200).send({
          unsignedTxCbor: result.unsignedTxCbor,
          fee: result.feeEstimateLovelace.toString(),
          ttl: Math.floor(Date.now() / 1000) + 300,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Failed to build submit work tx");
        return reply.status(500).send({
          error: "ChainError",
          code: "CHAIN_ERROR",
          message: `Failed to build transaction: ${msg}`,
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/submit-work
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: SubmitWorkBody }>(
    "/v1/bounties/:id/submit-work",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: SubmitWorkBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = SubmitWorkBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      await db
        .update(bounties)
        .set({
          status: "submitted",
          submitTxHash: txHash,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id));

      return reply.status(202).send({
        txHash,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/build-verify-and-pay
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: BuildVerifyAndPayBody }>(
    "/v1/bounties/:id/build-verify-and-pay",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: BuildVerifyAndPayBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = BuildVerifyAndPayBodySchema.parse(request.body);

      try {
        // Look up bounty from DB to get utxoRef and datum params
        const rows = await db
          .select()
          .from(bounties)
          .where(eq(bounties.id, id))
          .limit(1);

        const bounty = rows[0];
        if (!bounty) {
          return reply.status(404).send({ error: "Bounty not found" });
        }

        if (bounty.status !== "submitted") {
          return reply.status(409).send({ error: `Bounty work is not submitted (status: ${bounty.status})` });
        }

        if (!bounty.agentAddress) {
          return reply.status(409).send({ error: "Bounty has no assigned agent" });
        }

        const { buildVerifyAndPayTx } = await import("../services/txBuilder.js");
        const { encodeBountyDatum } = await import("../services/datumEncoder.js");

        // Build current datum from stored bounty data
        const currentDatum = encodeBountyDatum({
          title: bounty.title,
          descriptionIpfs: bounty.descriptionIpfs,
          category: bounty.category,
          difficulty: bounty.difficulty,
          rewardLovelace: bounty.rewardLovelace,
          deadline: bounty.deadline.toISOString(),
          verificationType: bounty.verificationType,
          posterAddress: bounty.posterAddress,
          tags: bounty.tags ?? [],
        });

        const result = await buildVerifyAndPayTx({
          bountyUtxoRef: bounty.utxoRef,
          agentAddress: bounty.agentAddress,
          posterAddress: bounty.posterAddress,
          rewardLovelace: bounty.rewardLovelace,
          currentDatum,
        });

        return reply.status(200).send({
          unsignedTxCbor: result.unsignedTxCbor,
          fee: result.feeEstimateLovelace.toString(),
          ttl: Math.floor(Date.now() / 1000) + 300,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Failed to build verify and pay tx");
        return reply.status(500).send({
          error: "ChainError",
          code: "CHAIN_ERROR",
          message: `Failed to build transaction: ${msg}`,
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/verify-and-pay
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: VerifyAndPayBody }>(
    "/v1/bounties/:id/verify-and-pay",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: VerifyAndPayBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = VerifyAndPayBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      const newStatus = body.verdict === "approved" ? "completed" : "rejected";
      await db
        .update(bounties)
        .set({
          status: newStatus,
          completeTxHash: txHash,
          completedAt: body.verdict === "approved" ? new Date() : undefined,
          paymentTxHash: body.verdict === "approved" ? txHash : undefined,
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id));

      return reply.status(202).send({
        txHash,
        verdict: body.verdict,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/build-dispute
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: BuildDisputeBody }>(
    "/v1/bounties/:id/build-dispute",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: BuildDisputeBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = BuildDisputeBodySchema.parse(request.body);

      try {
        // Look up bounty from DB to get utxoRef and datum params
        const rows = await db
          .select()
          .from(bounties)
          .where(eq(bounties.id, id))
          .limit(1);

        const bounty = rows[0];
        if (!bounty) {
          return reply.status(404).send({ error: "Bounty not found" });
        }

        if (bounty.status !== "submitted") {
          return reply.status(409).send({ error: `Bounty work is not submitted (status: ${bounty.status})` });
        }

        const { buildDisputeTx } = await import("../services/txBuilder.js");
        const { encodeBountyDatum } = await import("../services/datumEncoder.js");

        // Build current datum from stored bounty data
        const currentDatum = encodeBountyDatum({
          title: bounty.title,
          descriptionIpfs: bounty.descriptionIpfs,
          category: bounty.category,
          difficulty: bounty.difficulty,
          rewardLovelace: bounty.rewardLovelace,
          deadline: bounty.deadline.toISOString(),
          verificationType: bounty.verificationType,
          posterAddress: bounty.posterAddress,
          tags: bounty.tags ?? [],
        });

        // New datum: same bounty but with Disputed status
        const newDatum = currentDatum;

        const result = await buildDisputeTx({
          bountyUtxoRef: bounty.utxoRef,
          posterAddress: body.posterAddress,
          currentDatum,
          newDatum,
        });

        return reply.status(200).send({
          unsignedTxCbor: result.unsignedTxCbor,
          fee: result.feeEstimateLovelace.toString(),
          ttl: Math.floor(Date.now() / 1000) + 300,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Failed to build dispute tx");
        return reply.status(500).send({
          error: "ChainError",
          code: "CHAIN_ERROR",
          message: `Failed to build transaction: ${msg}`,
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/dispute
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: DisputeBody }>(
    "/v1/bounties/:id/dispute",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: DisputeBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = DisputeBodySchema.parse(request.body);

      const bountyRows = await db
        .select({ agentAddress: bounties.agentAddress })
        .from(bounties)
        .where(eq(bounties.id, id))
        .limit(1);

      const bounty = bountyRows[0];
      if (!bounty) {
        return reply.status(404).send({ error: "Bounty not found" });
      }

      const inserted = await db
        .insert(disputes)
        .values({
          bountyId: id,
          filedBy: body.filedBy,
          agentAddress: bounty.agentAddress ?? "",
          reason: body.reason,
          posterEvidenceIpfs: body.evidenceIpfs,
          status: "pending",
        })
        .returning({ id: disputes.id });

      await db
        .update(bounties)
        .set({ status: "disputed", updatedAt: new Date() })
        .where(eq(bounties.id, id));

      const disputeId = inserted[0]?.id ?? null;

      return reply.status(202).send({
        disputeId,
        bountyId: id,
        status: "pending",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/bounties/:id/cancel
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BountyIdParams; Body: CancelBody }>(
    "/v1/bounties/:id/cancel",
    async (
      request: FastifyRequest<{ Params: BountyIdParams; Body: CancelBody }>,
      reply: FastifyReply,
    ) => {
      const { id } = BountyIdParamsSchema.parse(request.params);
      const body = CancelBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      await db
        .update(bounties)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id));

      return reply.status(202).send({
        txHash,
        bountyId: id,
        status: "submitted",
      });
    },
  );
}
