import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and, desc, count, sql, sum, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { wallets, transactions, spendingEvents } from "../db/schema.js";
import { getAddressUtxos, submitTx } from "../services/blockfrost.js";

// ---------------------------------------------------------------------------
// Placeholder Zod schemas
// ---------------------------------------------------------------------------

const WalletAddressParamsSchema = z.object({
  address: z.string().min(1),
});

const CreateWalletBodySchema = z.object({
  ownerPkh: z.string(),
  agentPkh: z.string(),
  dailyLimitLovelace: z.string().optional(),
  perTxLimitLovelace: z.string().optional(),
  whitelistedScripts: z.array(z.string()).optional(),
  whitelistedAddresses: z.array(z.string()).optional(),
  requireOwnerAbove: z.string().optional(),
});

const TransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  direction: z.enum(["in", "out"]).optional(),
  txType: z.string().optional(),
});

const BuildSendBodySchema = z.object({
  toAddress: z.string(),
  lovelace: z.string(),
  tokenPolicy: z.string().optional(),
  tokenName: z.string().optional(),
  tokenAmount: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const SubmitSendBodySchema = z.object({
  signedTx: z.string(),
});

const BuildPolicyUpdateBodySchema = z.object({
  ownerAddress: z.string(),
  dailyLimitLovelace: z.string().optional(),
  perTxLimitLovelace: z.string().optional(),
  whitelistedScripts: z.array(z.string()).optional(),
  whitelistedAddresses: z.array(z.string()).optional(),
  requireOwnerAbove: z.string().optional(),
});

const SubmitPolicyUpdateBodySchema = z.object({
  ownerAddress: z.string(),
  signedTx: z.string(),
});

const SignMessageBodySchema = z.object({
  message: z.string(),
});

const VerifyMessageBodySchema = z.object({
  message: z.string(),
  signature: z.string(),
  publicKey: z.string(),
});

const PauseBodySchema = z.object({
  ownerAddress: z.string(),
  pauseUntil: z.string().datetime().optional(),
});

const DrainBodySchema = z.object({
  ownerAddress: z.string(),
  destinationAddress: z.string(),
  signedTx: z.string(),
});

const SpendingReportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(["day", "week", "month"]).default("day"),
});

// ---------------------------------------------------------------------------
// Route type helpers
// ---------------------------------------------------------------------------

type WalletAddressParams = z.infer<typeof WalletAddressParamsSchema>;
type CreateWalletBody = z.infer<typeof CreateWalletBodySchema>;
type TransactionsQuery = z.infer<typeof TransactionsQuerySchema>;
type BuildSendBody = z.infer<typeof BuildSendBodySchema>;
type SubmitSendBody = z.infer<typeof SubmitSendBodySchema>;
type BuildPolicyUpdateBody = z.infer<typeof BuildPolicyUpdateBodySchema>;
type SubmitPolicyUpdateBody = z.infer<typeof SubmitPolicyUpdateBodySchema>;
type SignMessageBody = z.infer<typeof SignMessageBodySchema>;
type VerifyMessageBody = z.infer<typeof VerifyMessageBodySchema>;
type PauseBody = z.infer<typeof PauseBodySchema>;
type DrainBody = z.infer<typeof DrainBodySchema>;
type SpendingReportQuery = z.infer<typeof SpendingReportQuerySchema>;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function walletsRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /v1/wallets — create a new agent smart wallet
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateWalletBody }>(
    "/v1/wallets",
    async (
      request: FastifyRequest<{ Body: CreateWalletBody }>,
      reply: FastifyReply,
    ) => {
      const body = CreateWalletBodySchema.parse(request.body);

      // TODO: derive the actual script address from ownerPkh + agentPkh via MeshSDK
      const address = `addr_test1_${body.ownerPkh.slice(0, 16)}_${body.agentPkh.slice(0, 16)}`;

      const inserted = await db
        .insert(wallets)
        .values({
          address,
          ownerPkh: body.ownerPkh,
          agentPkh: body.agentPkh,
          dailyLimitLovelace: body.dailyLimitLovelace ? BigInt(body.dailyLimitLovelace) : null,
          perTxLimitLovelace: body.perTxLimitLovelace ? BigInt(body.perTxLimitLovelace) : null,
          whitelistedScripts: body.whitelistedScripts ?? [],
          whitelistedAddresses: body.whitelistedAddresses ?? [],
          requireOwnerAbove: body.requireOwnerAbove ? BigInt(body.requireOwnerAbove) : null,
        })
        .returning();

      const wallet = inserted[0];
      if (!wallet) {
        return reply.status(500).send({ error: "Failed to create wallet" });
      }

      return reply.status(201).send({
        address: wallet.address,
        ownerPkh: wallet.ownerPkh,
        agentPkh: wallet.agentPkh,
        createdAt: wallet.createdAt?.toISOString() ?? new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/wallets/:address — wallet detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams }>(
    "/v1/wallets/:address",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);

      const rows = await db
        .select()
        .from(wallets)
        .where(eq(wallets.address, address))
        .limit(1);

      const wallet = rows[0];
      if (!wallet) {
        return reply.status(404).send({ error: "Wallet not found" });
      }

      return reply.status(200).send({
        address: wallet.address,
        ownerPkh: wallet.ownerPkh,
        agentPkh: wallet.agentPkh,
        isPaused: wallet.isPaused,
        pauseUntil: wallet.pauseUntil?.toISOString() ?? null,
        dailyLimitLovelace: wallet.dailyLimitLovelace?.toString() ?? null,
        perTxLimitLovelace: wallet.perTxLimitLovelace?.toString() ?? null,
        cachedAdaBalance: wallet.cachedAdaBalance?.toString() ?? null,
        createdAt: wallet.createdAt?.toISOString() ?? null,
        updatedAt: wallet.updatedAt?.toISOString() ?? null,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/wallets/:address/balance
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams }>(
    "/v1/wallets/:address/balance",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);

      // Check DB cache first
      const rows = await db
        .select({
          cachedAdaBalance: wallets.cachedAdaBalance,
          balanceCachedAt: wallets.balanceCachedAt,
        })
        .from(wallets)
        .where(eq(wallets.address, address))
        .limit(1);

      const wallet = rows[0];
      const cacheMaxAgeMs = 60_000; // 1 minute
      const now = new Date();

      if (
        wallet?.cachedAdaBalance !== null &&
        wallet?.cachedAdaBalance !== undefined &&
        wallet.balanceCachedAt &&
        now.getTime() - wallet.balanceCachedAt.getTime() < cacheMaxAgeMs
      ) {
        return reply.status(200).send({
          lovelace: wallet.cachedAdaBalance.toString(),
          tokens: [],
          cachedAt: wallet.balanceCachedAt.toISOString(),
        });
      }

      // Fetch fresh from Blockfrost
      const utxos = await getAddressUtxos(address);
      let totalLovelace = 0n;
      const tokens: Array<{ policy: string; name: string; quantity: string }> = [];

      for (const utxo of utxos) {
        const u = utxo as { amount?: Array<{ unit: string; quantity: string }> };
        if (u.amount) {
          for (const a of u.amount) {
            if (a.unit === "lovelace") {
              totalLovelace += BigInt(a.quantity);
            } else {
              tokens.push({
                policy: a.unit.slice(0, 56),
                name: a.unit.slice(56),
                quantity: a.quantity,
              });
            }
          }
        }
      }

      // Update cache
      if (wallet) {
        await db
          .update(wallets)
          .set({
            cachedAdaBalance: totalLovelace,
            balanceCachedAt: now,
          })
          .where(eq(wallets.address, address));
      }

      return reply.status(200).send({
        lovelace: totalLovelace.toString(),
        tokens,
        cachedAt: now.toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/wallets/:address/utxos
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams }>(
    "/v1/wallets/:address/utxos",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);

      const utxos = await getAddressUtxos(address);

      return reply.status(200).send({
        utxos,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/wallets/:address/transactions
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams; Querystring: TransactionsQuery }>(
    "/v1/wallets/:address/transactions",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Querystring: TransactionsQuery }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const query = TransactionsQuerySchema.parse(request.query);

      const conditions = [eq(transactions.walletAddress, address)];
      if (query.direction) conditions.push(eq(transactions.direction, query.direction));
      if (query.txType) conditions.push(eq(transactions.txType, query.txType));

      const whereClause = and(...conditions);

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(transactions)
          .where(whereClause)
          .orderBy(desc(transactions.createdAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ total: count() })
          .from(transactions)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      return reply.status(200).send({
        address,
        data: rows.map((tx) => ({
          ...tx,
          amountLovelace: tx.amountLovelace.toString(),
          tokenAmount: tx.tokenAmount?.toString() ?? null,
          blockTime: tx.blockTime?.toISOString() ?? null,
          createdAt: tx.createdAt?.toISOString() ?? null,
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
  // GET /v1/wallets/:address/policy — current spending policy
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams }>(
    "/v1/wallets/:address/policy",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);

      const rows = await db
        .select({
          dailyLimitLovelace: wallets.dailyLimitLovelace,
          perTxLimitLovelace: wallets.perTxLimitLovelace,
          whitelistedScripts: wallets.whitelistedScripts,
          whitelistedAddresses: wallets.whitelistedAddresses,
          requireOwnerAbove: wallets.requireOwnerAbove,
        })
        .from(wallets)
        .where(eq(wallets.address, address))
        .limit(1);

      const wallet = rows[0];
      if (!wallet) {
        return reply.status(404).send({ error: "Wallet not found" });
      }

      return reply.status(200).send({
        dailyLimitLovelace: wallet.dailyLimitLovelace?.toString() ?? null,
        perTxLimitLovelace: wallet.perTxLimitLovelace?.toString() ?? null,
        whitelistedScripts: wallet.whitelistedScripts ?? [],
        whitelistedAddresses: wallet.whitelistedAddresses ?? [],
        requireOwnerAbove: wallet.requireOwnerAbove?.toString() ?? null,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/build-send
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: BuildSendBody }>(
    "/v1/wallets/:address/build-send",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: BuildSendBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = BuildSendBodySchema.parse(request.body);

      void address;
      void body;
      return reply.status(200).send({
        unsignedTxCbor: "84a400placeholder",
        fee: "175000",
        ttl: Math.floor(Date.now() / 1000) + 300,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/submit-send
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: SubmitSendBody }>(
    "/v1/wallets/:address/submit-send",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: SubmitSendBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = SubmitSendBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      // Record in transactions table
      await db.insert(transactions).values({
        txHash,
        walletAddress: address,
        direction: "out",
        amountLovelace: 0n, // Will be updated by indexer with actual amount
        txType: "send",
      });

      // Record in spending_events table
      await db.insert(spendingEvents).values({
        walletAddress: address,
        amountLovelace: 0n, // Will be updated by indexer
        txHash,
      });

      return reply.status(202).send({
        txHash,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/build-policy-update
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: BuildPolicyUpdateBody }>(
    "/v1/wallets/:address/build-policy-update",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: BuildPolicyUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = BuildPolicyUpdateBodySchema.parse(request.body);

      void address;
      void body;
      return reply.status(200).send({
        unsignedTxCbor: "84a400placeholder",
        fee: "175000",
        ttl: Math.floor(Date.now() / 1000) + 300,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/submit-policy-update
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: SubmitPolicyUpdateBody }>(
    "/v1/wallets/:address/submit-policy-update",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: SubmitPolicyUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = SubmitPolicyUpdateBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      // TODO: parse the new policy datum from the tx and update the wallets table
      void address;

      return reply.status(202).send({
        txHash,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/sign-message
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: SignMessageBody }>(
    "/v1/wallets/:address/sign-message",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: SignMessageBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = SignMessageBodySchema.parse(request.body);

      void address;
      void body;
      // TODO: sign using agent key managed server-side (HSM / KMS)
      return reply.status(200).send({
        signature: "placeholder_signature",
        publicKey: "placeholder_pubkey",
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/verify-message
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: VerifyMessageBody }>(
    "/v1/wallets/:address/verify-message",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: VerifyMessageBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = VerifyMessageBodySchema.parse(request.body);

      void address;
      void body;
      // TODO: Ed25519 verify using jose or @cardano-sdk/crypto
      return reply.status(200).send({
        valid: false,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/pause
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: PauseBody }>(
    "/v1/wallets/:address/pause",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: PauseBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = PauseBodySchema.parse(request.body);

      await db
        .update(wallets)
        .set({
          isPaused: true,
          pauseUntil: body.pauseUntil ? new Date(body.pauseUntil) : null,
          updatedAt: new Date(),
        })
        .where(eq(wallets.address, address));

      return reply.status(200).send({
        address,
        isPaused: true,
        pauseUntil: body.pauseUntil ?? null,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /v1/wallets/:address/drain
  // -------------------------------------------------------------------------
  fastify.post<{ Params: WalletAddressParams; Body: DrainBody }>(
    "/v1/wallets/:address/drain",
    async (
      request: FastifyRequest<{ Params: WalletAddressParams; Body: DrainBody }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const body = DrainBodySchema.parse(request.body);

      const txHash = await submitTx(body.signedTx);

      void address;
      return reply.status(202).send({
        txHash,
        status: "submitted",
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /v1/wallets/:address/spending-report
  // -------------------------------------------------------------------------
  fastify.get<{ Params: WalletAddressParams; Querystring: SpendingReportQuery }>(
    "/v1/wallets/:address/spending-report",
    async (
      request: FastifyRequest<{
        Params: WalletAddressParams;
        Querystring: SpendingReportQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { address } = WalletAddressParamsSchema.parse(request.params);
      const query = SpendingReportQuerySchema.parse(request.query);

      const conditions = [eq(spendingEvents.walletAddress, address)];
      if (query.from) conditions.push(gte(spendingEvents.spentAt, new Date(query.from)));
      if (query.to) conditions.push(lte(spendingEvents.spentAt, new Date(query.to)));

      const whereClause = and(...conditions);

      const truncExpr =
        query.period === "day"
          ? sql`date_trunc('day', ${spendingEvents.spentAt})`
          : query.period === "week"
            ? sql`date_trunc('week', ${spendingEvents.spentAt})`
            : sql`date_trunc('month', ${spendingEvents.spentAt})`;

      const buckets = await db
        .select({
          periodStart: truncExpr.as("period_start"),
          total: sql<string>`COALESCE(SUM(${spendingEvents.amountLovelace}), 0)::text`,
          txCount: count(),
        })
        .from(spendingEvents)
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
}
