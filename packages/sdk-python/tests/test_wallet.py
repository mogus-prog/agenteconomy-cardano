"""Tests for AgentWallet."""

import pytest
from agenteconomy.wallet import AgentWallet


def test_create_sync():
    wallet, mnemonic = AgentWallet.create_sync(
        blockfrost_project_id="test_key",
        network="preprod",
    )
    assert len(mnemonic) == 24
    assert wallet is not None


def test_from_mnemonic():
    mnemonic = ["abandon"] * 24
    wallet = AgentWallet.from_mnemonic(
        mnemonic, blockfrost_project_id="test_key", network="preprod"
    )
    assert wallet is not None


def test_from_mnemonic_invalid_length():
    with pytest.raises(ValueError, match="24 words"):
        AgentWallet.from_mnemonic(
            ["abandon", "abandon"],
            blockfrost_project_id="test_key",
        )


def test_from_key_file():
    wallet = AgentWallet.from_key_file(
        "test.skey",
        blockfrost_project_id="test_key",
        network="preprod",
    )
    assert wallet is not None


def test_get_address_sync():
    wallet, _ = AgentWallet.create_sync(blockfrost_project_id="test_key")
    address = wallet.get_address_sync()
    assert isinstance(address, str)
    assert len(address) > 0


@pytest.mark.asyncio
async def test_estimate_fee():
    wallet, _ = await AgentWallet.create(blockfrost_project_id="test_key")
    fee = await wallet.estimate_fee("addr_test1_recipient", 5_000_000)
    assert fee > 0
    assert fee < 1_000_000


@pytest.mark.asyncio
async def test_sign_and_verify_message():
    wallet, _ = await AgentWallet.create(blockfrost_project_id="test_key")
    sig = await wallet.sign_message("hello world")
    assert sig.signature
    assert sig.pub_key

    valid = await wallet.verify_message("hello", sig.signature, sig.pub_key)
    assert valid is True


@pytest.mark.asyncio
async def test_check_policy_compliance_when_api_unavailable():
    wallet, _ = await AgentWallet.create(blockfrost_project_id="test_key")
    result = await wallet.check_policy_compliance("addr_test1_to", 5_000_000)
    assert result.compliant is True
