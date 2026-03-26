"""Tests for datum encoding/decoding."""

from agenteconomy.utils.datum import (
    encode_bounty_datum, decode_bounty_datum,
    encode_wallet_policy_datum, decode_wallet_policy_datum,
    encode_reputation_datum, decode_reputation_datum,
)
from agenteconomy.types import (
    BountyDatum, BountyStatus, BountyStatusType,
    VerificationType, BountyCategory, Difficulty, AssetId,
    WalletPolicyDatum, ReputationDatum,
)


def make_sample_bounty() -> BountyDatum:
    return BountyDatum(
        bounty_id="abc123",
        version=1,
        poster="addr_poster",
        title="Test Bounty",
        description_ipfs="bafybei_spec",
        category=BountyCategory.DATA_EXTRACTION,
        difficulty=Difficulty.MEDIUM,
        reward_lovelace=5_000_000,
        deposit_lovelace=2_000_000,
        deadline=1700000000000,
        claim_window_ms=3600000,
        verification=VerificationType(type="Optimistic", dispute_window_ms=1800000),
        dispute_window_ms=1800000,
        status=BountyStatus(type=BountyStatusType.OPEN),
        created_at=1699000000000,
        metadata_hash="sha256_hash",
    )


def test_bounty_datum_roundtrip_open():
    datum = make_sample_bounty()
    encoded = encode_bounty_datum(datum)
    decoded = decode_bounty_datum(encoded)
    assert decoded.bounty_id == datum.bounty_id
    assert decoded.category == BountyCategory.DATA_EXTRACTION
    assert decoded.status.type == BountyStatusType.OPEN


def test_bounty_datum_roundtrip_claimed():
    datum = BountyDatum(
        **{
            **make_sample_bounty().__dict__,
            "status": BountyStatus(
                type=BountyStatusType.CLAIMED,
                agent="agent_addr",
                claimed_at=1700000001000,
            ),
        }
    )
    encoded = encode_bounty_datum(datum)
    decoded = decode_bounty_datum(encoded)
    assert decoded.status.type == BountyStatusType.CLAIMED
    assert decoded.status.agent == "agent_addr"


def test_bounty_datum_with_reward_token():
    datum = BountyDatum(
        **{
            **make_sample_bounty().__dict__,
            "reward_token": AssetId("policy_abc", "iUSD"),
        }
    )
    encoded = encode_bounty_datum(datum)
    decoded = decode_bounty_datum(encoded)
    assert decoded.reward_token is not None
    assert decoded.reward_token.policy_id == "policy_abc"


def test_bounty_all_categories():
    for cat in BountyCategory:
        datum = BountyDatum(**{**make_sample_bounty().__dict__, "category": cat})
        decoded = decode_bounty_datum(encode_bounty_datum(datum))
        assert decoded.category == cat


def test_bounty_all_difficulties():
    for diff in Difficulty:
        datum = BountyDatum(**{**make_sample_bounty().__dict__, "difficulty": diff})
        decoded = decode_bounty_datum(encode_bounty_datum(datum))
        assert decoded.difficulty == diff


def test_wallet_policy_roundtrip():
    datum = WalletPolicyDatum(
        owner_pkh="owner",
        agent_pkh="agent",
        daily_limit_lovelace=50_000_000,
        per_tx_limit_lovelace=10_000_000,
        whitelisted_scripts=["script1"],
        whitelisted_addresses=["addr1"],
        require_owner_above=20_000_000,
        allowed_tokens=[AssetId("policy1", "iUSD")],
        max_fee_lovelace=500_000,
        nonce=0,
        policy_version=1,
    )
    encoded = encode_wallet_policy_datum(datum)
    decoded = decode_wallet_policy_datum(encoded)
    assert decoded.owner_pkh == "owner"
    assert decoded.per_tx_limit_lovelace == 10_000_000
    assert decoded.nonce == 0


def test_wallet_policy_with_multisig():
    datum = WalletPolicyDatum(
        owner_pkh="owner",
        agent_pkh="agent",
        daily_limit_lovelace=50_000_000,
        per_tx_limit_lovelace=10_000_000,
        whitelisted_scripts=[],
        whitelisted_addresses=[],
        require_owner_above=20_000_000,
        allowed_tokens=[],
        max_fee_lovelace=500_000,
        nonce=5,
        policy_version=1,
        multisig_threshold=(2, ["key1", "key2", "key3"]),
    )
    encoded = encode_wallet_policy_datum(datum)
    decoded = decode_wallet_policy_datum(encoded)
    assert decoded.multisig_threshold is not None
    assert decoded.multisig_threshold[0] == 2
    assert len(decoded.multisig_threshold[1]) == 3


def test_reputation_datum_roundtrip():
    datum = ReputationDatum(
        agent_pkh="agent",
        total_completed=10,
        total_earned_lovelace=50_000_000,
        total_disputed=1,
        success_rate_bps=9000,
        avg_completion_ms=120000,
        category_scores=[("01", 8500), ("02", 9200)],
        last_active=1700000000000,
        badge_tokens=["badge1"],
        registered_at=1690000000000,
    )
    encoded = encode_reputation_datum(datum)
    decoded = decode_reputation_datum(encoded)
    assert decoded.total_completed == 10
    assert decoded.success_rate_bps == 9000
    assert len(decoded.category_scores) == 2
