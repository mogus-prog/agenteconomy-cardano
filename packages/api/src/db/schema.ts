import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
} from "drizzle-orm/pg-core";

export const bounties = pgTable(
  "bounties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utxoRef: text("utxo_ref").unique().notNull(),
    version: integer("version").notNull().default(1),

    title: text("title").notNull(),
    descriptionIpfs: text("description_ipfs").notNull(),
    category: text("category").notNull(),
    difficulty: text("difficulty").notNull(),
    tags: text("tags").array().default([]),
    resultSchemaIpfs: text("result_schema_ipfs"),

    rewardLovelace: bigint("reward_lovelace", { mode: "bigint" }).notNull(),
    rewardTokenPolicy: text("reward_token_policy"),
    rewardTokenName: text("reward_token_name"),
    rewardTokenAmount: bigint("reward_token_amount", { mode: "bigint" }),
    bondLovelace: bigint("bond_lovelace", { mode: "bigint" }).notNull().$defaultFn(() => 0n),

    posterAddress: text("poster_address").notNull(),
    agentAddress: text("agent_address"),
    allowedAgents: text("allowed_agents").array(),

    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    claimWindowMs: bigint("claim_window_ms", { mode: "bigint" }).notNull(),
    disputeWindowMs: bigint("dispute_window_ms", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

    verificationType: text("verification_type").notNull(),
    oraclePubKey: text("oracle_pub_key"),

    status: text("status").notNull().default("open"),
    resultIpfs: text("result_ipfs"),
    paymentTxHash: text("payment_tx_hash"),

    postTxHash: text("post_tx_hash").notNull(),
    claimTxHash: text("claim_tx_hash"),
    submitTxHash: text("submit_tx_hash"),
    completeTxHash: text("complete_tx_hash"),
  },
  (table) => [
    index("idx_bounties_status").on(table.status),
    index("idx_bounties_category").on(table.category),
    index("idx_bounties_deadline").on(table.deadline),
    index("idx_bounties_poster").on(table.posterAddress),
    index("idx_bounties_agent").on(table.agentAddress),
  ],
);

export const agents = pgTable("agents", {
  address: text("address").primaryKey(),
  pubKeyHash: text("pub_key_hash").unique(),
  reputationUtxoRef: text("reputation_utxo_ref"),

  totalCompleted: integer("total_completed").notNull().default(0),
  totalDisputed: integer("total_disputed").notNull().default(0),
  totalDisputesWon: integer("total_disputes_won").notNull().default(0),
  successRateBps: integer("success_rate_bps").notNull().default(0),
  totalEarnedLovelace: bigint("total_earned_lovelace", { mode: "bigint" }).notNull().$defaultFn(() => 0n),
  avgCompletionMs: bigint("avg_completion_ms", { mode: "bigint" }),

  categoryScores: jsonb("category_scores").default({}),

  profileIpfs: text("profile_ipfs"),
  displayName: text("display_name"),
  lastActive: timestamp("last_active", { withTimezone: true }),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),

  rankGlobal: integer("rank_global"),
  isVerified: boolean("is_verified").default(false),
});

export const wallets = pgTable("wallets", {
  address: text("address").primaryKey(),
  ownerPkh: text("owner_pkh").notNull(),
  agentPkh: text("agent_pkh").notNull(),
  policyUtxoRef: text("policy_utxo_ref"),

  dailyLimitLovelace: bigint("daily_limit_lovelace", { mode: "bigint" }),
  perTxLimitLovelace: bigint("per_tx_limit_lovelace", { mode: "bigint" }),
  whitelistedScripts: text("whitelisted_scripts").array(),
  whitelistedAddresses: text("whitelisted_addresses").array(),
  requireOwnerAbove: bigint("require_owner_above", { mode: "bigint" }),
  isPaused: boolean("is_paused").default(false),
  pauseUntil: timestamp("pause_until", { withTimezone: true }),

  cachedAdaBalance: bigint("cached_ada_balance", { mode: "bigint" }),
  balanceCachedAt: timestamp("balance_cached_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable("transactions", {
  txHash: text("tx_hash").primaryKey(),
  walletAddress: text("wallet_address").references(() => wallets.address),
  direction: text("direction").notNull(),
  amountLovelace: bigint("amount_lovelace", { mode: "bigint" }).notNull(),
  tokenPolicy: text("token_policy"),
  tokenName: text("token_name"),
  tokenAmount: bigint("token_amount", { mode: "bigint" }),
  counterparty: text("counterparty"),
  bountyId: uuid("bounty_id").references(() => bounties.id),
  txType: text("tx_type"),
  metadata: jsonb("metadata"),
  blockHeight: integer("block_height"),
  blockTime: timestamp("block_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  bountyId: uuid("bounty_id").notNull().references(() => bounties.id),
  filedBy: text("filed_by").notNull(),
  agentAddress: text("agent_address").notNull(),
  reason: text("reason"),
  posterEvidenceIpfs: text("poster_evidence_ipfs"),
  agentEvidenceIpfs: text("agent_evidence_ipfs"),
  status: text("status").default("pending"),
  resolution: text("resolution"),
  splitPercentage: integer("split_percentage"),
  resolutionTxHash: text("resolution_tx_hash"),
  filedAt: timestamp("filed_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipient: text("recipient").notNull(),
  type: text("type").notNull(),
  channel: text("channel").notNull(),
  payload: jsonb("payload").notNull(),
  delivered: boolean("delivered").default(false),
  retries: integer("retries").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const spendingEvents = pgTable(
  "spending_events",
  {
    id: serial("id").primaryKey(),
    walletAddress: text("wallet_address").notNull(),
    amountLovelace: bigint("amount_lovelace", { mode: "bigint" }).notNull(),
    txHash: text("tx_hash").notNull(),
    spentAt: timestamp("spent_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_spending_wallet_time").on(table.walletAddress, table.spentAt),
  ],
);

export const apiKeys = pgTable("api_keys", {
  keyHash: text("key_hash").primaryKey(),
  walletAddress: text("wallet_address").references(() => wallets.address),
  userId: text("user_id"),
  name: text("name"),
  scopes: text("scopes").array(),
  rateLimitRpm: integer("rate_limit_rpm").default(60),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
});
