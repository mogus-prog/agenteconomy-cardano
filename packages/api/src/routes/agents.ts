import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and, desc, asc, count, sql, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, bounties, transactions } from "../db/schema.js";

// ---------------------------------------------------------------------------
// Placeholder Zod schemas
// ---------------------------------------------------------------------------

const AgentAddressParamsSchema = z.object({
  address: z.string().min(1),
});

const AgentListQuerySchema = z.object({
  category: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  minSuccessRateBps: z.coerce.number().int().min(0).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(["totalCompleted", "successRateBps", "totalEarnedLovelace", "rankGlobal"]).default("rankGlobal"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

const AgentBountiesQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const EarningsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(["day", "week", "month"]).default("month"),
});

const LeaderboardQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const RegisterAgentBodySchema = z.object({
  address: z.string(),
  pubKeyHash: z.string(),
  displayName: z.string().optional(),
  profileIpfs: z.string().optional(),
});

const UpdateProfileBodySchema = z.object({
  displayName: z.string().optional(),
  profileIpfs: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Route type helpers
// ---------------------------------------------------------------------------

type AgentAddressParams = z.infer<typeof AgentAddressParamsSchema>;
type AgentListQuery = z.infer<typeof AgentListQuerySchema>;
type AgentBountiesQuery = z.infer<typeof AgentBountiesQuerySchema>;
type EarningsQuery = z.infer<typeof EarningsQuerySchema>;
type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
type RegisterAgentBody = z.infer<typeof RegisterAgentBodySchema>;
type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const agentOrderColumnMap = {
  totalCompleted: agents.totalCompleted,
  successRateBps: agents.successRateBps,
  totalEarnedLovelace: agents.totalEarnedLovelace,
  rankGlobal: agents.rankGlobal,
} as const;

function serializeAgent(row: typeof agents.$inferSelect) {
  return {
    ...row,
    totalEarnedLovelace: row.totalEarnedLovelace.toString(),
    avgCompletionMs: row.avgCompletionMs?.toString() ?? null,
    lastActive: row.lastActive?.toISOString() ?? null,
    registeredAt: row.registeredAt.toISOString(),
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
}

function deriveBadges(agent: typeof agents.$inferSelect): Badge[] {
  const badges: Badge[] = [];

  if (agent.totalCompleted >= 1) {
    badges.push({ id: "first-bounty", name: "First Bounty", description: "Completed first bounty" });
  }
  if (agent.totalCompleted >= 10) {
    badges.push({ id: "ten-bounties", name: "Veteran", description: "Completed 10 bounties" });
  }
  if (agent.totalCompleted >= 50) {
    badges.push({ id: "fifty-bounties", name: "Expert", description: "Completed 50 bounties" });
  }
  if (agent.successRateBps >= 9500) {
    badges.push({ id: "high-success", name: "Reliable", description: "95%+ success rate" });
  }
  if (agent.isVerified) {
    badges.push({ id: "verified", name: "Verified", description: "On-chain verified agent" });
  }
  if (agent.totalEarnedLovelace >= 1_000_000_000n) {
    badges.push({ id: "whale-earner", name: "Top Earner", description: "Earned 1000+ ADA" });
  }

  return badges;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function agentsRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /v1/agents — list agents
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: AgentListQuery }>(
    "/v1/agents",
    async (
      request: FastifyRequest<{ Querystring: AgentListQuery }>,
      reply: FastifyReply,
    ) => {
      const query = AgentListQuerySchema.parse(request.query);

      const conditions = [];
      if (query.isVerified !== undefined) conditions.push(eq(agents.isVerified, query.isVerified));
      if (query.minSuccessRateBps !== undefined) {
        conditions.push(gte(agents.successRateBps, query.minSuccessRateBps));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderCol = agentOrderColumnMap[query.orderBy];
      const orderFn = query.order === "asc" ? asc : desc;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(agents)
          .where(whereClause)
          .orderBy(orderFn(orderCol))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(agents)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        data: rows.map(serializeAgent),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/agents/leaderboard — must be declared before /:address
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: LeaderboardQuery }>(
    "/v1/agents/leaderboard",
    async (
      request: FastifyRequest<{ Querystring: LeaderboardQuery }>,
      reply: FastifyReply,
    ) => {
      const query = LeaderboardQuerySchema.parse(request.query);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(agents)
          .orderBy(asc(agents.rankGlobal))
          .limit(query.limit)
          .offset(query.offset),
        db.select({ total: count() }).from(agents),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        data: rows.map(serializeAgent),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/agents/register — must be declared before /:address
  // -------------------------------------------------------------------------
  fastify.post<{ Body: RegisterAgentBody }>(
    "/v1/agents/register",
    async (
      request: FastifyRequest<{ Body: RegisterAgentBody }>,
      reply: FastifyReply,
    ) => {
      const body = RegisterAgentBodySchema.parse(request.body);

      const inserted = await db
        .insert(agents)
        .values({
          address: body.address,
          pubKeyHash: body.pubKeyHash,
          displayName: body.displayName,
          profileIpfs: body.profileIpfs,
        })
        .onConflictDoUpdate({
          target: agents.address,
          set: {
            pubKeyHash: body.pubKeyHash,
            displayName: body.displayName,
            profileIpfs: body.profileIpfs,
            lastActive: new Date(),
          },
        })
        .returning();

      const agent = inserted[0];
      if (!agent) {
        return reply.status(500).send({ error: "Failed to register agent" });
      }

      return reply.status(201).send({
        address: agent.address,
        pubKeyHash: agent.pubKeyHash,
        displayName: agent.displayName ?? null,
        registeredAt: agent.registeredAt.toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/agents/:address — agent detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: AgentAddressParams }>(
    "/v1/agents/:address",
    async (
      request: FastifyRequest<{ Params: AgentAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = AgentAddressParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(agents)
        .where(eq(agents.address, address))
        .limit(1);

      const agent = rows[0];
      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      return reply.status(200).send(serializeAgent(agent));
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/agents/:address/bounties
  // -------------------------------------------------------------------------
  fastify.get<{ Params: AgentAddressParams; Querystring: AgentBountiesQuery }>(
    "/v1/agents/:address/bounties",
    async (
      request: FastifyRequest<{
        Params: AgentAddressParams;
        Querystring: AgentBountiesQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { address } = AgentAddressParamsSchema.parse(request.params);
      const query = AgentBountiesQuerySchema.parse(request.query);

      const conditions = [eq(bounties.agentAddress, address)];
      if (query.status) conditions.push(eq(bounties.status, query.status));

      const whereClause = and(...conditions);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(bounties)
          .where(whereClause)
          .orderBy(desc(bounties.createdAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(bounties)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        address,
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
  // GET /v1/agents/:address/earnings
  // -------------------------------------------------------------------------
  fastify.get<{ Params: AgentAddressParams; Querystring: EarningsQuery }>(
    "/v1/agents/:address/earnings",
    async (
      request: FastifyRequest<{
        Params: AgentAddressParams;
        Querystring: EarningsQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { address } = AgentAddressParamsSchema.parse(request.params);
      const query = EarningsQuerySchema.parse(request.query);

      const conditions = [
        eq(transactions.walletAddress, address),
        eq(transactions.direction, "in"),
      ];
      if (query.from) conditions.push(gte(transactions.createdAt, new Date(query.from)));
      if (query.to) conditions.push(lte(transactions.createdAt, new Date(query.to)));

      const whereClause = and(...conditions);

      const truncExpr =
        query.period === "day"
          ? sql`date_trunc('day', ${transactions.createdAt})`
          : query.period === "week"
            ? sql`date_trunc('week', ${transactions.createdAt})`
            : sql`date_trunc('month', ${transactions.createdAt})`;

      const buckets = await db
        .select({
          periodStart: truncExpr.as("period_start"),
          total: sql<string>`COALESCE(SUM(${transactions.amountLovelace}), 0)::text`,
          txCount: count(),
        })
        .from(transactions)
        .where(whereClause)
        .groupBy(sql`period_start`)
        .orderBy(sql`period_start`);

      let totalLovelace = 0n;
      for (const b of buckets) {
        totalLovelace += BigInt(b.total);
      }

      return reply.status(200).send({
        address,
        period: query.period,
        from: query.from ?? null,
        to: query.to ?? null,
        totalLovelace: totalLovelace.toString(),
        buckets: buckets.map((b) => ({
          periodStart: String(b.periodStart),
          totalLovelace: b.total,
          txCount: b.txCount,
        })),
      });
    },
  );

  // -------------------------------------------------------------------------
  // PATCH /v1/agents/:address/profile
  // -------------------------------------------------------------------------
  fastify.patch<{ Params: AgentAddressParams; Body: UpdateProfileBody }>(
    "/v1/agents/:address/profile",
    async (
      request: FastifyRequest<{
        Params: AgentAddressParams;
        Body: UpdateProfileBody;
      }>,
      reply: FastifyReply,
    ) => {
      const { address } = AgentAddressParamsSchema.parse(request.params);
      const body = UpdateProfileBodySchema.parse(request.body);

      const updateFields: Record<string, unknown> = {};
      if (body.displayName !== undefined) updateFields.displayName = body.displayName;
      if (body.profileIpfs !== undefined) updateFields.profileIpfs = body.profileIpfs;
      updateFields.lastActive = new Date();

      const updated = await db
        .update(agents)
        .set(updateFields)
        .where(eq(agents.address, address))
        .returning({
          address: agents.address,
          displayName: agents.displayName,
          profileIpfs: agents.profileIpfs,
          lastActive: agents.lastActive,
        });

      const agent = updated[0];
      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      return reply.status(200).send({
        address: agent.address,
        displayName: agent.displayName ?? null,
        profileIpfs: agent.profileIpfs ?? null,
        updatedAt: agent.lastActive?.toISOString() ?? new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/agents/:address/badges
  // -------------------------------------------------------------------------
  fastify.get<{ Params: AgentAddressParams }>(
    "/v1/agents/:address/badges",
    async (
      request: FastifyRequest<{ Params: AgentAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = AgentAddressParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(agents)
        .where(eq(agents.address, address))
        .limit(1);

      const agent = rows[0];
      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      const badges = deriveBadges(agent);

      return reply.status(200).send({
        address,
        badges,
      });
    },
  );
}
