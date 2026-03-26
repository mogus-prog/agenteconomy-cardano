"""Plutus Data encoding/decoding for all datum types."""

from __future__ import annotations

from typing import Any

from agenteconomy.types import (
    BountyDatum, WalletPolicyDatum, ReputationDatum,
    BountyStatus, BountyStatusType, VerificationType,
    BountyCategory, Difficulty, AssetId,
)

# Plutus Data representation as nested dicts/lists
PlutusData = dict[str, Any] | int | str | list | None


def constr(index: int, fields: list[Any]) -> dict[str, Any]:
    """Create a Plutus Data constructor."""
    return {"constructor": index, "fields": fields}


def option_to_data(val: Any, encoder: Any = None) -> dict[str, Any]:
    """Encode an optional value as Plutus None/Some."""
    if val is None:
        return constr(1, [])
    encoded = encoder(val) if encoder else val
    return constr(0, [encoded])


def data_to_option(data: Any, decoder: Any = None) -> Any:
    """Decode Plutus None/Some to Python optional."""
    if isinstance(data, dict) and "constructor" in data:
        if data["constructor"] == 1:
            return None
        if data["constructor"] == 0 and data["fields"]:
            return decoder(data["fields"][0]) if decoder else data["fields"][0]
    return None


CATEGORY_INDEX = {
    BountyCategory.DATA_EXTRACTION: 0,
    BountyCategory.CODE_GEN: 1,
    BountyCategory.RESEARCH: 2,
    BountyCategory.CONTENT: 3,
    BountyCategory.ON_CHAIN: 4,
    BountyCategory.TRANSLATION: 5,
    BountyCategory.MODERATION: 6,
}

INDEX_CATEGORY = {v: k for k, v in CATEGORY_INDEX.items()}

DIFFICULTY_INDEX = {
    Difficulty.EASY: 0,
    Difficulty.MEDIUM: 1,
    Difficulty.HARD: 2,
    Difficulty.EXPERT: 3,
}

INDEX_DIFFICULTY = {v: k for k, v in DIFFICULTY_INDEX.items()}


def encode_bounty_datum(datum: BountyDatum) -> dict[str, Any]:
    """Encode BountyDatum to Plutus Data."""
    return constr(0, [
        datum.bounty_id,
        datum.version,
        datum.poster,
        datum.title,
        datum.description_ipfs,
        constr(CATEGORY_INDEX[datum.category], []),
        constr(DIFFICULTY_INDEX[datum.difficulty], []),
        datum.reward_lovelace,
        option_to_data(datum.reward_token, lambda t: constr(0, [t.policy_id, t.asset_name])),
        datum.deposit_lovelace,
        datum.deadline,
        datum.claim_window_ms,
        _encode_verification(datum.verification),
        datum.dispute_window_ms,
        option_to_data(datum.result_schema_ipfs),
        option_to_data(datum.allowed_agents),
        option_to_data(datum.min_reputation_score),
        _encode_status(datum.status),
        datum.created_at,
        datum.metadata_hash,
    ])


def decode_bounty_datum(data: dict[str, Any]) -> BountyDatum:
    """Decode Plutus Data to BountyDatum."""
    f = data["fields"]
    return BountyDatum(
        bounty_id=f[0],
        version=f[1],
        poster=f[2],
        title=f[3],
        description_ipfs=f[4],
        category=INDEX_CATEGORY[f[5]["constructor"]],
        difficulty=INDEX_DIFFICULTY[f[6]["constructor"]],
        reward_lovelace=f[7],
        reward_token=data_to_option(f[8], lambda d: AssetId(d["fields"][0], d["fields"][1])),
        deposit_lovelace=f[9],
        deadline=f[10],
        claim_window_ms=f[11],
        verification=_decode_verification(f[12]),
        dispute_window_ms=f[13],
        result_schema_ipfs=data_to_option(f[14]),
        allowed_agents=data_to_option(f[15]),
        min_reputation_score=data_to_option(f[16]),
        status=_decode_status(f[17]),
        created_at=f[18],
        metadata_hash=f[19],
    )


def encode_wallet_policy_datum(datum: WalletPolicyDatum) -> dict[str, Any]:
    """Encode WalletPolicyDatum to Plutus Data."""
    return constr(0, [
        datum.owner_pkh,
        datum.agent_pkh,
        datum.daily_limit_lovelace,
        datum.per_tx_limit_lovelace,
        datum.whitelisted_scripts,
        datum.whitelisted_addresses,
        datum.require_owner_above,
        [constr(0, [t.policy_id, t.asset_name]) for t in datum.allowed_tokens],
        datum.max_fee_lovelace,
        option_to_data(datum.pause_until),
        option_to_data(
            datum.multisig_threshold,
            lambda ms: constr(0, [ms[0], ms[1]]),
        ),
        datum.nonce,
        datum.policy_version,
    ])


def decode_wallet_policy_datum(data: dict[str, Any]) -> WalletPolicyDatum:
    """Decode Plutus Data to WalletPolicyDatum."""
    f = data["fields"]
    return WalletPolicyDatum(
        owner_pkh=f[0],
        agent_pkh=f[1],
        daily_limit_lovelace=f[2],
        per_tx_limit_lovelace=f[3],
        whitelisted_scripts=f[4],
        whitelisted_addresses=f[5],
        require_owner_above=f[6],
        allowed_tokens=[AssetId(t["fields"][0], t["fields"][1]) for t in f[7]],
        max_fee_lovelace=f[8],
        pause_until=data_to_option(f[9]),
        multisig_threshold=data_to_option(f[10], lambda d: (d["fields"][0], d["fields"][1])),
        nonce=f[11],
        policy_version=f[12],
    )


def encode_reputation_datum(datum: ReputationDatum) -> dict[str, Any]:
    """Encode ReputationDatum to Plutus Data."""
    return constr(0, [
        datum.agent_pkh,
        datum.total_completed,
        datum.total_earned_lovelace,
        datum.total_disputed,
        datum.success_rate_bps,
        datum.avg_completion_ms,
        [[cat_id, score] for cat_id, score in datum.category_scores],
        datum.last_active,
        datum.badge_tokens,
        datum.registered_at,
    ])


def decode_reputation_datum(data: dict[str, Any]) -> ReputationDatum:
    """Decode Plutus Data to ReputationDatum."""
    f = data["fields"]
    return ReputationDatum(
        agent_pkh=f[0],
        total_completed=f[1],
        total_earned_lovelace=f[2],
        total_disputed=f[3],
        success_rate_bps=f[4],
        avg_completion_ms=f[5],
        category_scores=[(pair[0], pair[1]) for pair in f[6]],
        last_active=f[7],
        badge_tokens=f[8],
        registered_at=f[9],
    )


def _encode_verification(v: VerificationType) -> dict[str, Any]:
    if v.type == "Optimistic":
        return constr(0, [v.dispute_window_ms])
    elif v.type == "HumanReview":
        return constr(1, [])
    elif v.type == "OracleSigned":
        return constr(2, [v.oracle_pub_key])
    else:
        return constr(3, [])


def _decode_verification(data: dict[str, Any]) -> VerificationType:
    idx = data["constructor"]
    fields = data["fields"]
    if idx == 0:
        return VerificationType(type="Optimistic", dispute_window_ms=fields[0])
    elif idx == 1:
        return VerificationType(type="HumanReview")
    elif idx == 2:
        return VerificationType(type="OracleSigned", oracle_pub_key=fields[0])
    else:
        return VerificationType(type="JudgeAgent")


def _encode_status(s: BountyStatus) -> dict[str, Any]:
    status_map = {
        BountyStatusType.OPEN: (0, []),
        BountyStatusType.CLAIMED: (1, [s.agent, s.claimed_at]),
        BountyStatusType.WORK_SUBMITTED: (2, [s.result_ipfs, s.submitted_at]),
        BountyStatusType.COMPLETED: (3, [s.result_ipfs, s.completed_at]),
        BountyStatusType.DISPUTED: (4, []),
        BountyStatusType.REFUNDED: (5, []),
    }
    idx, fields = status_map[s.type]
    return constr(idx, fields)


def _decode_status(data: dict[str, Any]) -> BountyStatus:
    idx = data["constructor"]
    fields = data["fields"]
    if idx == 0:
        return BountyStatus(type=BountyStatusType.OPEN)
    elif idx == 1:
        return BountyStatus(type=BountyStatusType.CLAIMED, agent=fields[0], claimed_at=fields[1])
    elif idx == 2:
        return BountyStatus(type=BountyStatusType.WORK_SUBMITTED, result_ipfs=fields[0], submitted_at=fields[1])
    elif idx == 3:
        return BountyStatus(type=BountyStatusType.COMPLETED, result_ipfs=fields[0], completed_at=fields[1])
    elif idx == 4:
        return BountyStatus(type=BountyStatusType.DISPUTED)
    else:
        return BountyStatus(type=BountyStatusType.REFUNDED)
