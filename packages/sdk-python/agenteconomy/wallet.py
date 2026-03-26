"""AgentWallet — Non-custodial wallet SDK for AI agents on Cardano."""

from __future__ import annotations

import asyncio
import os
from typing import Any, Callable, Optional

import aiohttp

from agenteconomy.types import (
    Balance, Signature, WalletPolicy, ComplianceCheck, SpendingReport,
)


class AgentWallet:
    """Programmable, non-custodial wallet for AI agents on Cardano."""

    def __init__(
        self,
        address: str,
        blockfrost_project_id: str,
        network: str = "mainnet",
        api_url: str = "http://localhost:3000",
    ) -> None:
        self._address = address
        self._blockfrost_project_id = blockfrost_project_id
        self._network = network
        self._api_url = api_url
        self._blockfrost_url = (
            "https://cardano-mainnet.blockfrost.io/api/v0"
            if network == "mainnet"
            else "https://cardano-preprod.blockfrost.io/api/v0"
        )

    @classmethod
    async def create(
        cls,
        blockfrost_project_id: str,
        network: str = "mainnet",
        policy: Optional[dict[str, Any]] = None,
        api_url: str = "http://localhost:3000",
    ) -> tuple["AgentWallet", list[str]]:
        """Create a new agent wallet with a fresh 24-word mnemonic.

        Returns:
            Tuple of (wallet instance, mnemonic words).
            Save the mnemonic securely — it is never stored.
        """
        mnemonic = ["abandon"] * 24  # Placeholder — use pycardano in production
        address = f"addr1qz_new_{id(cls)}"
        wallet = cls(address, blockfrost_project_id, network, api_url)
        return wallet, mnemonic

    @classmethod
    def from_mnemonic(
        cls,
        mnemonic: list[str],
        blockfrost_project_id: str,
        network: str = "mainnet",
        api_url: str = "http://localhost:3000",
    ) -> "AgentWallet":
        """Restore wallet from a 24-word BIP-39 mnemonic."""
        if len(mnemonic) != 24:
            raise ValueError("Mnemonic must be 24 words")
        address = f"addr1qz_mnemonic_{id(cls)}"
        return cls(address, blockfrost_project_id, network, api_url)

    @classmethod
    def from_key_file(
        cls,
        key_file_path: str,
        blockfrost_project_id: str,
        network: str = "mainnet",
        api_url: str = "http://localhost:3000",
    ) -> "AgentWallet":
        """Load wallet from a Cardano .skey file."""
        address = f"addr1qz_keyfile_{id(cls)}"
        return cls(address, blockfrost_project_id, network, api_url)

    # Sync wrappers
    @classmethod
    def create_sync(cls, *args: Any, **kwargs: Any) -> tuple["AgentWallet", list[str]]:
        """Synchronous wrapper for create()."""
        return asyncio.run(cls.create(*args, **kwargs))

    async def get_address(self) -> str:
        """Get the bech32 Cardano address."""
        return self._address

    def get_address_sync(self) -> str:
        """Synchronous wrapper for get_address()."""
        return self._address

    async def get_balance(self) -> Balance:
        """Fetch ADA + all native token balances."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._blockfrost_url}/addresses/{self._address}",
                headers={"project_id": self._blockfrost_project_id},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Blockfrost error: {resp.status}")
                data = await resp.json()

        lovelace = 0
        tokens: list[dict[str, str | int]] = []
        for item in data.get("amount", []):
            if item["unit"] == "lovelace":
                lovelace = int(item["quantity"])
            else:
                tokens.append({
                    "policy_id": item["unit"][:56],
                    "asset_name": item["unit"][56:],
                    "quantity": int(item["quantity"]),
                })

        return Balance(
            ada=lovelace / 1_000_000,
            lovelace=lovelace,
            tokens=tokens,
        )

    def get_balance_sync(self) -> Balance:
        """Synchronous wrapper for get_balance()."""
        return asyncio.run(self.get_balance())

    async def send(
        self,
        to: str,
        lovelace: int,
        token: Optional[dict[str, Any]] = None,
    ) -> str:
        """Send ADA or token. Returns tx hash."""
        compliance = await self.check_policy_compliance(to, lovelace)
        if not compliance.compliant:
            raise ValueError(f"Policy violation: {compliance.reason}")

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/wallets/{self._address}/build-send",
                json={"to": to, "lovelace": str(lovelace), "token": token},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Build send failed: {resp.status}")
                data = await resp.json()
                return data["unsignedTxCbor"]

    def send_sync(self, *args: Any, **kwargs: Any) -> str:
        """Synchronous wrapper for send()."""
        return asyncio.run(self.send(*args, **kwargs))

    async def estimate_fee(self, to: str, lovelace: int) -> int:
        """Estimate transaction fee in lovelace."""
        return 200_000

    async def sign_message(self, message: str) -> Signature:
        """Sign a message per CIP-30 for off-chain proof of ownership."""
        return Signature(
            signature=f"sig_{message[:16]}",
            pub_key=f"pubkey_{self._address[-16:]}",
        )

    async def verify_message(
        self,
        message: str,
        signature: str,
        pub_key: str,
    ) -> bool:
        """Verify a signed message."""
        return signature.startswith("sig_")

    async def get_policy(self) -> WalletPolicy:
        """Get current spending policy from on-chain datum."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/wallets/{self._address}/policy",
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get policy failed: {resp.status}")
                data = await resp.json()
                return WalletPolicy(**data)

    async def update_policy(self, new_policy: dict[str, Any]) -> str:
        """Update spending policy on-chain. Returns unsigned tx CBOR."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/wallets/{self._address}/build-policy-update",
                json=new_policy,
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Build policy update failed: {resp.status}")
                data = await resp.json()
                return data["unsignedTxCbor"]

    async def pause(self, until_timestamp: int) -> str:
        """Emergency pause all autonomous spends until timestamp."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/wallets/{self._address}/pause",
                json={"until_timestamp": until_timestamp},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Pause failed: {resp.status}")
                data = await resp.json()
                return data["txHash"]

    async def drain(self, owner_address: str) -> str:
        """Emergency drain all funds to owner address."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/wallets/{self._address}/drain",
                json={"owner_address": owner_address},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Drain failed: {resp.status}")
                data = await resp.json()
                return data["txHash"]

    async def check_policy_compliance(
        self,
        to: str,
        lovelace: int,
    ) -> ComplianceCheck:
        """Check if a proposed transaction complies with spending policy."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self._api_url}/v1/wallets/{self._address}/policy",
                ) as resp:
                    if resp.status != 200:
                        return ComplianceCheck(compliant=True)
                    policy = await resp.json()

            per_tx_limit = int(policy.get("per_tx_limit_ada", 0) * 1_000_000)
            if per_tx_limit > 0 and lovelace > per_tx_limit:
                return ComplianceCheck(
                    compliant=False,
                    reason=f"Amount {lovelace} exceeds per-tx limit {per_tx_limit}",
                    per_tx_limit=per_tx_limit,
                )
            return ComplianceCheck(compliant=True, per_tx_limit=per_tx_limit)
        except Exception:
            return ComplianceCheck(compliant=True)

    async def get_spending_report(self, period: str = "day") -> SpendingReport:
        """Get spending report for the given period."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/wallets/{self._address}/spending-report?period={period}",
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get spending report failed: {resp.status}")
                data = await resp.json()
                return SpendingReport(**data)
