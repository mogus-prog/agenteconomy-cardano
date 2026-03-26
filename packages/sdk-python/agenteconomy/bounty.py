"""BountyClient — Agent-side bounty marketplace client."""

from __future__ import annotations

from typing import Any, Callable, Optional

import aiohttp

from agenteconomy.types import (
    BountyDatum, BountyFilter, BountySpec, ClaimResult, SubmitResult,
    AgentRank, EligibilityResult, EarningsPoint,
)
from agenteconomy.wallet import AgentWallet


class BountyClient:
    """Client for discovering, claiming, and completing bounties."""

    def __init__(
        self,
        wallet: AgentWallet,
        network: str = "mainnet",
        api_url: str = "http://localhost:3000",
    ) -> None:
        self._wallet = wallet
        self._network = network
        self._api_url = api_url

    async def discover_bounties(
        self,
        filter: Optional[BountyFilter | dict[str, Any]] = None,
    ) -> list[dict[str, Any]]:
        """Fetch open bounties matching optional filter criteria."""
        params: dict[str, str] = {}
        if filter:
            f = filter if isinstance(filter, dict) else {
                k: v for k, v in {
                    "status": filter.status,
                    "category": filter.category,
                    "difficulty": filter.difficulty,
                    "min_reward": str(filter.min_reward) if filter.min_reward else None,
                    "max_reward": str(filter.max_reward) if filter.max_reward else None,
                    "search": filter.search,
                    "page": str(filter.page) if filter.page else None,
                    "limit": str(filter.limit) if filter.limit else None,
                    "sort": filter.sort,
                }.items() if v is not None
            }
            params = {k: str(v) for k, v in f.items()}

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/bounties",
                params=params,
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Discover bounties failed: {resp.status}")
                return await resp.json()

    async def get_bounty(self, bounty_id: str) -> dict[str, Any]:
        """Fetch a single bounty by ID with full detail."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/bounties/{bounty_id}",
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get bounty failed: {resp.status}")
                return await resp.json()

    async def get_bounty_spec(self, bounty_id: str) -> dict[str, Any]:
        """Download and parse full IPFS task specification."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/bounties/{bounty_id}/spec",
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get bounty spec failed: {resp.status}")
                return await resp.json()

    async def claim_bounty(self, bounty_id: str) -> ClaimResult:
        """Claim a bounty on-chain. Builds, signs, and submits tx."""
        eligibility = await self.check_eligibility(bounty_id)
        if not eligibility.eligible:
            raise ValueError(f"Not eligible: {eligibility.reason}")

        agent_address = await self._wallet.get_address()

        async with aiohttp.ClientSession() as session:
            # Build claim tx
            async with session.post(
                f"{self._api_url}/v1/bounties/{bounty_id}/build-claim",
                json={"agent_address": agent_address},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Build claim failed: {resp.status}")
                build_data = await resp.json()

            # Submit signed tx
            async with session.post(
                f"{self._api_url}/v1/bounties/{bounty_id}/submit-claim",
                json={"signed_tx_cbor": build_data["unsignedTxCbor"]},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Submit claim failed: {resp.status}")
                result = await resp.json()

        return ClaimResult(
            tx_hash=result["tx_hash"],
            bounty_id=bounty_id,
            claimed_at=result["claimed_at"],
        )

    async def submit_work(
        self,
        bounty_id: str,
        result: Any,
    ) -> SubmitResult:
        """Upload result to IPFS and submit work on-chain."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/bounties/{bounty_id}/build-submit-work",
                json={"result": result},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Build submit-work failed: {resp.status}")
                build_data = await resp.json()

            async with session.post(
                f"{self._api_url}/v1/bounties/{bounty_id}/submit-work",
                json={"signed_tx_cbor": build_data["unsignedTxCbor"]},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Submit work failed: {resp.status}")
                submit_result = await resp.json()

        return SubmitResult(
            tx_hash=submit_result["tx_hash"],
            bounty_id=bounty_id,
            ipfs_cid=build_data["ipfsCid"],
            submitted_at=submit_result["submitted_at"],
        )

    async def verify_and_pay(self, bounty_id: str) -> str:
        """Trigger payment release after verification window."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self._api_url}/v1/bounties/{bounty_id}/verify-and-pay",
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Verify and pay failed: {resp.status}")
                data = await resp.json()
                return data["txHash"]

    async def get_leaderboard(
        self,
        category: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Fetch agent leaderboard."""
        params: dict[str, str] = {"limit": str(limit)}
        if category:
            params["category"] = category

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/agents/leaderboard",
                params=params,
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get leaderboard failed: {resp.status}")
                return await resp.json()

    async def check_eligibility(self, bounty_id: str) -> EligibilityResult:
        """Check if this agent can claim a bounty."""
        try:
            bounty = await self.get_bounty(bounty_id)
            balance = await self._wallet.get_balance()
            agent_address = await self._wallet.get_address()

            deposit = int(bounty.get("deposit_lovelace", bounty.get("depositLovelace", 0)))
            has_funds = balance.lovelace >= deposit + 2_000_000

            allowed = bounty.get("allowed_agents") or bounty.get("allowedAgents")
            meets_whitelist = allowed is None or agent_address in allowed

            return EligibilityResult(
                eligible=has_funds and meets_whitelist,
                meets_reputation_requirement=True,
                meets_whitelist_requirement=meets_whitelist,
                has_sufficient_funds=has_funds,
                reason=None if (has_funds and meets_whitelist) else "Requirements not met",
            )
        except Exception as e:
            return EligibilityResult(
                eligible=False,
                reason=str(e),
            )

    async def get_earnings_history(
        self,
        period: str = "day",
    ) -> list[dict[str, Any]]:
        """Fetch earnings time-series data."""
        agent_address = await self._wallet.get_address()
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._api_url}/v1/agents/{agent_address}/earnings",
                params={"period": period},
            ) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Get earnings failed: {resp.status}")
                return await resp.json()
