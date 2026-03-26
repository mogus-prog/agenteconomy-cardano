"""Tests for types module."""

from agenteconomy.types import (
    Balance, BountyDatum, BountyStatus, BountyStatusType,
    VerificationType, BountyCategory, Difficulty, AssetId,
    WalletPolicyDatum, ReputationDatum, ClaimResult, SubmitResult,
    ComplianceCheck, EligibilityResult, Signature,
)


def test_balance_creation():
    b = Balance(ada=100.0, lovelace=100_000_000, tokens=[])
    assert b.ada == 100.0
    assert b.lovelace == 100_000_000
    assert b.tokens == []


def test_bounty_datum_creation():
    datum = BountyDatum(
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
    assert datum.bounty_id == "abc123"
    assert datum.category == BountyCategory.DATA_EXTRACTION
    assert datum.status.type == BountyStatusType.OPEN


def test_bounty_status_claimed():
    s = BountyStatus(type=BountyStatusType.CLAIMED, agent="agent_addr", claimed_at=123)
    assert s.type == BountyStatusType.CLAIMED
    assert s.agent == "agent_addr"


def test_verification_types():
    opt = VerificationType(type="Optimistic", dispute_window_ms=1800000)
    assert opt.dispute_window_ms == 1800000

    hr = VerificationType(type="HumanReview")
    assert hr.type == "HumanReview"

    oracle = VerificationType(type="OracleSigned", oracle_pub_key="key123")
    assert oracle.oracle_pub_key == "key123"


def test_wallet_policy_datum():
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
    assert datum.owner_pkh == "owner"
    assert len(datum.allowed_tokens) == 1


def test_reputation_datum():
    datum = ReputationDatum(
        agent_pkh="agent",
        total_completed=10,
        total_earned_lovelace=50_000_000,
        total_disputed=1,
        success_rate_bps=9000,
        avg_completion_ms=120000,
        category_scores=[("01", 8500)],
        last_active=1700000000000,
        badge_tokens=["badge1"],
        registered_at=1690000000000,
    )
    assert datum.total_completed == 10
    assert datum.success_rate_bps == 9000


def test_claim_result():
    r = ClaimResult(tx_hash="tx1", bounty_id="b1", claimed_at=123)
    assert r.tx_hash == "tx1"


def test_compliance_check():
    ok = ComplianceCheck(compliant=True)
    assert ok.compliant is True

    fail = ComplianceCheck(compliant=False, reason="Over limit")
    assert fail.compliant is False
    assert fail.reason == "Over limit"


def test_eligibility_result():
    e = EligibilityResult(
        eligible=True,
        meets_reputation_requirement=True,
        meets_whitelist_requirement=True,
        has_sufficient_funds=True,
    )
    assert e.eligible is True
