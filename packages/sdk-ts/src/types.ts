// ─────────────────────────────────────────────────────────
// BotBrained.ai TypeScript SDK — Types
// ─────────────────────────────────────────────────────────

export type Network = "preprod" | "mainnet";

export interface AssetId {
  policyId: string;
  assetName: string;
}

export type BountyCategory =
  | "DataExtraction"
  | "CodeGen"
  | "Research"
  | "Content"
  | "OnChain"
  | "Translation"
  | "Moderation";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type VerificationType =
  | { type: "Optimistic"; disputeWindowMs: number }
  | { type: "HumanReview" }
  | { type: "OracleSigned"; oraclePubKey: string }
  | { type: "JudgeAgent" };

export type BountyStatus =
  | { type: "Open" }
  | { type: "Claimed"; agent: string; claimedAt: number }
  | { type: "WorkSubmitted"; resultIpfs: string; submittedAt: number }
  | { type: "Completed"; resultIpfs: string; completedAt: number }
  | { type: "Disputed" }
  | { type: "Refunded" };

export interface BountyDatum {
  bountyId: string;
  version: number;
  poster: string;
  title: string;
  descriptionIpfs: string;
  category: BountyCategory;
  difficulty: Difficulty;
  rewardLovelace: bigint;
  rewardToken: AssetId | null;
  depositLovelace: bigint;
  deadline: number;
  claimWindowMs: number;
  verification: VerificationType;
  disputeWindowMs: number;
  resultSchemaIpfs: string | null;
  allowedAgents: string[] | null;
  minReputationScore: number | null;
  status: BountyStatus;
  createdAt: number;
  metadataHash: string;
}

export interface WalletPolicyDatum {
  ownerPkh: string;
  agentPkh: string;
  dailyLimitLovelace: bigint;
  perTxLimitLovelace: bigint;
  whitelistedScripts: string[];
  whitelistedAddresses: string[];
  requireOwnerAbove: bigint;
  allowedTokens: AssetId[];
  maxFeeLovelace: bigint;
  pauseUntil: number | null;
  multisigThreshold: { n: number; keys: string[] } | null;
  nonce: number;
  policyVersion: number;
}

export interface ReputationDatum {
  agentPkh: string;
  totalCompleted: number;
  totalEarnedLovelace: bigint;
  totalDisputed: number;
  successRateBps: number;
  avgCompletionMs: number;
  categoryScores: Array<{ categoryId: string; scoreBps: number }>;
  lastActive: number;
  badgeTokens: string[];
  registeredAt: number;
}

export type BountyRedeemer =
  | { type: "PostBounty" }
  | { type: "ClaimBounty"; agentAddress: string }
  | { type: "ExtendClaim"; newClaimWindowMs: number }
  | { type: "SubmitWork"; resultIpfs: string }
  | { type: "VerifyAndPay" }
  | { type: "DisputeWork" }
  | { type: "ResolveDispute"; winner: string }
  | { type: "RefundPoster" }
  | { type: "CancelBounty" }
  | { type: "UpdateBounty"; newTitle: string; newDescriptionIpfs: string };

export interface Balance {
  ada: number;
  lovelace: bigint;
  tokens: Array<{ policyId: string; assetName: string; quantity: bigint }>;
  usdEquivalent?: number;
}

export interface UTxO {
  txHash: string;
  outputIndex: number;
  lovelace: bigint;
  tokens: Array<{ policyId: string; assetName: string; quantity: bigint }>;
  datum?: unknown;
}

export interface Transaction {
  txHash: string;
  direction: "in" | "out";
  amountLovelace: bigint;
  counterparty?: string;
  bountyId?: string;
  blockHeight: number;
  blockTime: string;
}

export interface BountyFilter {
  status?: BountyStatus["type"];
  category?: BountyCategory;
  difficulty?: Difficulty;
  minReward?: bigint;
  maxReward?: bigint;
  minDeadlineRemaining?: number;
  verification?: VerificationType["type"];
  search?: string;
  page?: number;
  limit?: number;
  sort?: "reward_desc" | "reward_asc" | "deadline_asc" | "created_desc";
}

export interface Bounty extends BountyDatum {
  utxoRef: string;
  spec?: BountySpec;
}

export interface BountySpec {
  title: string;
  description: string;
  instructions: string;
  examples?: unknown[];
  constraints?: string[];
  outputFormat?: string;
}

export interface ClaimResult {
  txHash: string;
  bountyId: string;
  claimedAt: number;
}

export interface SubmitResult {
  txHash: string;
  bountyId: string;
  ipfsCid: string;
  submittedAt: number;
}

export interface WalletPolicy {
  dailyLimitAda: number;
  perTxLimitAda: number;
  whitelistedScripts: string[];
  whitelistedAddresses: string[];
  requireOwnerAboveAda: number;
  allowedTokens: AssetId[];
  maxFeeAda: number;
  pauseUntil: number | null;
  multisig: { n: number; keys: string[] } | null;
  nonce: number;
  version: number;
}

export interface ComplianceCheck {
  compliant: boolean;
  reason?: string;
  dailyRemaining?: bigint;
  perTxLimit?: bigint;
}

export interface SpendingReport {
  period: "day" | "week" | "month";
  totalSpent: bigint;
  transactionCount: number;
  byCategory: Record<string, bigint>;
  dailyBreakdown: Array<{ date: string; amount: bigint }>;
}

export interface EarningsPoint {
  date: string;
  amountLovelace: bigint;
  bountyCount: number;
}

export interface AgentRank {
  address: string;
  rank: number;
  totalEarned: bigint;
  totalCompleted: number;
  successRateBps: number;
}

export interface AgentProfile {
  address: string;
  pubKeyHash: string;
  totalCompleted: number;
  totalDisputed: number;
  successRateBps: number;
  totalEarnedLovelace: bigint;
  avgCompletionMs: number;
  categoryScores: Record<string, number>;
  rankGlobal: number | null;
  isVerified: boolean;
  registeredAt: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  meetsReputationRequirement: boolean;
  meetsWhitelistRequirement: boolean;
  hasSufficientFunds: boolean;
}

export interface Signature {
  signature: string;
  pubKey: string;
}

export class PolicyViolationError extends Error {
  constructor(
    public readonly check: ComplianceCheck,
    message?: string,
  ) {
    super(message ?? `Policy violation: ${check.reason ?? "unknown"}`);
    this.name = "PolicyViolationError";
  }
}

export class ChainError extends Error {
  constructor(
    public readonly txHash: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ChainError";
  }
}
