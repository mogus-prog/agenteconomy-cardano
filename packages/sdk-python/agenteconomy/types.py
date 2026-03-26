"""BotBrained.ai type definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class BountyCategory(str, Enum):
    DATA_EXTRACTION = "DataExtraction"
    CODE_GEN = "CodeGen"
    RESEARCH = "Research"
    CONTENT = "Content"
    ON_CHAIN = "OnChain"
    TRANSLATION = "Translation"
    MODERATION = "Moderation"


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    EXPERT = "Expert"


class BountyStatusType(str, Enum):
    OPEN = "Open"
    CLAIMED = "Claimed"
    WORK_SUBMITTED = "WorkSubmitted"
    COMPLETED = "Completed"
    DISPUTED = "Disputed"
    REFUNDED = "Refunded"


@dataclass(frozen=True)
class AssetId:
    policy_id: str
    asset_name: str


@dataclass(frozen=True)
class Balance:
    ada: float
    lovelace: int
    tokens: list[dict[str, str | int]] = field(default_factory=list)
    usd_equivalent: Optional[float] = None


@dataclass(frozen=True)
class BountyStatus:
    type: BountyStatusType
    agent: Optional[str] = None
    claimed_at: Optional[int] = None
    result_ipfs: Optional[str] = None
    submitted_at: Optional[int] = None
    completed_at: Optional[int] = None


@dataclass(frozen=True)
class VerificationType:
    type: str  # "Optimistic" | "HumanReview" | "OracleSigned" | "JudgeAgent"
    dispute_window_ms: Optional[int] = None
    oracle_pub_key: Optional[str] = None


@dataclass(frozen=True)
class BountyDatum:
    bounty_id: str
    version: int
    poster: str
    title: str
    description_ipfs: str
    category: BountyCategory
    difficulty: Difficulty
    reward_lovelace: int
    deposit_lovelace: int
    deadline: int
    claim_window_ms: int
    verification: VerificationType
    dispute_window_ms: int
    status: BountyStatus
    created_at: int
    metadata_hash: str
    reward_token: Optional[AssetId] = None
    result_schema_ipfs: Optional[str] = None
    allowed_agents: Optional[list[str]] = None
    min_reputation_score: Optional[int] = None


@dataclass(frozen=True)
class BountySpec:
    title: str
    description: str
    instructions: str
    examples: Optional[list[dict]] = None
    constraints: Optional[list[str]] = None
    output_format: Optional[str] = None


@dataclass(frozen=True)
class BountyFilter:
    status: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    min_reward: Optional[int] = None
    max_reward: Optional[int] = None
    search: Optional[str] = None
    page: Optional[int] = None
    limit: Optional[int] = None
    sort: Optional[str] = None


@dataclass(frozen=True)
class ClaimResult:
    tx_hash: str
    bounty_id: str
    claimed_at: int


@dataclass(frozen=True)
class SubmitResult:
    tx_hash: str
    bounty_id: str
    ipfs_cid: str
    submitted_at: int


@dataclass(frozen=True)
class WalletPolicy:
    daily_limit_ada: float
    per_tx_limit_ada: float
    whitelisted_scripts: list[str]
    whitelisted_addresses: list[str]
    require_owner_above_ada: float
    allowed_tokens: list[AssetId]
    max_fee_ada: float
    pause_until: Optional[int]
    multisig: Optional[dict]
    nonce: int
    version: int


@dataclass(frozen=True)
class ComplianceCheck:
    compliant: bool
    reason: Optional[str] = None
    daily_remaining: Optional[int] = None
    per_tx_limit: Optional[int] = None


@dataclass(frozen=True)
class SpendingReport:
    period: str
    total_spent: int
    transaction_count: int
    by_category: dict[str, int] = field(default_factory=dict)
    daily_breakdown: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class EarningsPoint:
    date: str
    amount_lovelace: int
    bounty_count: int


@dataclass(frozen=True)
class AgentRank:
    address: str
    rank: int
    total_earned: int
    total_completed: int
    success_rate_bps: int


@dataclass(frozen=True)
class AgentProfile:
    address: str
    pub_key_hash: str
    total_completed: int
    total_disputed: int
    success_rate_bps: int
    total_earned_lovelace: int
    avg_completion_ms: int
    category_scores: dict[str, int]
    rank_global: Optional[int]
    is_verified: bool
    registered_at: str


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reason: Optional[str] = None
    meets_reputation_requirement: bool = False
    meets_whitelist_requirement: bool = False
    has_sufficient_funds: bool = False


@dataclass(frozen=True)
class Signature:
    signature: str
    pub_key: str


@dataclass(frozen=True)
class WalletPolicyDatum:
    owner_pkh: str
    agent_pkh: str
    daily_limit_lovelace: int
    per_tx_limit_lovelace: int
    whitelisted_scripts: list[str]
    whitelisted_addresses: list[str]
    require_owner_above: int
    allowed_tokens: list[AssetId]
    max_fee_lovelace: int
    nonce: int
    policy_version: int
    pause_until: Optional[int] = None
    multisig_threshold: Optional[tuple[int, list[str]]] = None


@dataclass(frozen=True)
class ReputationDatum:
    agent_pkh: str
    total_completed: int
    total_earned_lovelace: int
    total_disputed: int
    success_rate_bps: int
    avg_completion_ms: int
    category_scores: list[tuple[str, int]]
    last_active: int
    badge_tokens: list[str]
    registered_at: int
