// ─────────────────────────────────────────────────────────
// AgentEconomy on Cardano — Shared Types
// ─────────────────────────────────────────────────────────

/// POSIX time in milliseconds (UNIX epoch)
pub type POSIXTime =
  Int

/// Asset identifier: policy ID + asset name
pub type AssetId {
  policy_id: ByteArray,
  asset_name: ByteArray,
}

/// Bounty task category — 7 types
pub type BountyCategory {
  DataExtraction
  CodeGen
  Research
  Content
  OnChain
  Translation
  Moderation
}

/// Task difficulty level
pub type Difficulty {
  Easy
  Medium
  Hard
  Expert
}

/// How bounty work is verified before payment release
pub type VerificationType {
  /// Auto-pay after dispute window passes with no dispute
  Optimistic { dispute_window_ms: Int }
  /// Poster manually reviews and approves
  HumanReview
  /// Oracle node signs verification
  OracleSigned { oracle_pub_key: ByteArray }
  /// Another AI agent judges the work
  JudgeAgent
}

/// Current status of a bounty UTXO
pub type BountyStatus {
  Open
  Claimed { agent: ByteArray, claimed_at: POSIXTime }
  WorkSubmitted { result_ipfs: ByteArray, submitted_at: POSIXTime }
  Completed { result_ipfs: ByteArray, completed_at: POSIXTime }
  Disputed
  Refunded
}

/// On-chain datum for every bounty UTXO at BountyRegistry
pub type BountyDatum {
  bounty_id: ByteArray,
  version: Int,
  poster: ByteArray,
  title: ByteArray,
  description_ipfs: ByteArray,
  category: BountyCategory,
  difficulty: Difficulty,
  reward_lovelace: Int,
  reward_token: Option<AssetId>,
  deposit_lovelace: Int,
  deadline: POSIXTime,
  claim_window_ms: Int,
  verification: VerificationType,
  dispute_window_ms: Int,
  result_schema_ipfs: Option<ByteArray>,
  allowed_agents: Option<List<ByteArray>>,
  min_reputation_score: Option<Int>,
  status: BountyStatus,
  created_at: POSIXTime,
  metadata_hash: ByteArray,
}

/// All possible actions on a bounty UTXO
pub type BountyRedeemer {
  PostBounty
  ClaimBounty { agent_address: ByteArray }
  ExtendClaim { new_claim_window_ms: Int }
  SubmitWork { result_ipfs: ByteArray }
  VerifyAndPay
  DisputeWork
  ResolveDispute { winner: ByteArray }
  RefundPoster
  CancelBounty
  UpdateBounty { new_title: ByteArray, new_description_ipfs: ByteArray }
}

/// On-chain datum for agent wallet spending policy
pub type WalletPolicyDatum {
  owner_pkh: ByteArray,
  agent_pkh: ByteArray,
  daily_limit_lovelace: Int,
  per_tx_limit_lovelace: Int,
  whitelisted_scripts: List<ByteArray>,
  whitelisted_addresses: List<ByteArray>,
  require_owner_above: Int,
  allowed_tokens: List<AssetId>,
  max_fee_lovelace: Int,
  pause_until: Option<POSIXTime>,
  multisig_threshold: Option<(Int, List<ByteArray>)>,
  nonce: Int,
  policy_version: Int,
}

/// All possible actions on agent wallet UTXO
pub type WalletRedeemer {
  SpendAgent
  SpendOwner
  SpendMultisig
  UpdatePolicy
  PauseWallet { until: POSIXTime }
  UnpauseWallet
  DrainToOwner
  DelegateAgent { new_agent_pkh: ByteArray }
}

/// On-chain reputation datum for an agent
pub type ReputationDatum {
  agent_pkh: ByteArray,
  total_completed: Int,
  total_earned_lovelace: Int,
  total_disputed: Int,
  success_rate_bps: Int,
  avg_completion_ms: Int,
  category_scores: List<(ByteArray, Int)>,
  last_active: POSIXTime,
  badge_tokens: List<ByteArray>,
  registered_at: POSIXTime,
}
