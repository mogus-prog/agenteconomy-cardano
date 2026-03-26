/* ── Enums / Union types ── */

export type BountyStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";

export type BountyCategory =
  | "DataExtraction"
  | "CodeGen"
  | "Research"
  | "Content"
  | "OnChain"
  | "Translation"
  | "Moderation";

export type Difficulty = "easy" | "medium" | "hard";

export type VerificationType = "Optimistic" | "HumanReview" | "Oracle";

export type DisputeStatus = "pending" | "in_progress" | "resolved";

/* ── Core models ── */

export interface Bounty {
  id: string;
  utxoRef?: string;
  title: string;
  description: string;
  descriptionIpfs?: string;
  category: BountyCategory;
  difficulty: Difficulty;
  tags: string[];
  rewardLovelace: string;
  status: BountyStatus;
  posterAddress: string;
  agentAddress?: string;
  deadline: string;
  claimedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  verificationType: VerificationType;
  disputeWindowMinutes?: number;
  resultIpfs?: string;
  resultSchema?: {
    type: "object";
    required: string[];
    properties: Record<string, { type: string; description: string }>;
  };
  postTxHash?: string;
  claimTxHash?: string;
  submitTxHash?: string;
  completeTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BountyFilters {
  status?: BountyStatus | "All";
  category?: BountyCategory | "All";
  difficulty?: Difficulty;
  search?: string;
  posterAddress?: string;
  agentAddress?: string;
  limit?: number;
  offset?: number;
  orderBy?: "createdAt" | "rewardLovelace" | "deadline";
  order?: "asc" | "desc";
}

export interface BountyStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  disputed: number;
  totalRewardLovelace: string;
  avgRewardLovelace: string;
}

export interface Agent {
  address: string;
  pubKeyHash?: string;
  totalCompleted: number;
  totalDisputed: number;
  successRateBps: number;
  totalEarnedLovelace: string;
  categoryScores?: Record<string, number>;
  displayName?: string;
  lastActive?: string;
  rankGlobal?: number;
  isVerified: boolean;
}

export interface AgentBadge {
  name: string;
  description: string;
  earnedAt: string;
}

export interface WalletBalance {
  lovelace: string;
  tokens: Array<{ unit: string; quantity: string }>;
  cachedAt?: string;
}

export interface Transaction {
  txHash: string;
  direction: "in" | "out";
  amountLovelace: string;
  counterparty?: string;
  txType?: string;
  blockTime: string;
  bountyId?: string;
}

export interface Dispute {
  id: string;
  bountyId: string;
  filedBy: string;
  agentAddress: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  filedAt: string;
  resolvedAt?: string;
}

export interface SpendingPolicy {
  dailyLimitLovelace?: string;
  perTxLimitLovelace?: string;
  whitelistedAddresses: string[];
  whitelistedScripts?: string[];
  requireOwnerAbove?: string;
}

export interface BuildTxResponse {
  unsignedTxCbor: string;
  fee: string;
  ttl: number;
}

export interface SubmitTxResponse {
  txHash: string;
  status: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface EarningsBucket {
  period: string;
  totalLovelace: string;
}
