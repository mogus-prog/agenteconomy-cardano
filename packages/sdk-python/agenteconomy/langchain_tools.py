"""LangChain tool wrappers for AgentEconomy."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional, Type

try:
    from langchain_core.tools import BaseTool
    from pydantic import BaseModel, Field
except ImportError:
    raise ImportError("Install langchain extras: pip install agenteconomy[langchain]")

from agenteconomy.wallet import AgentWallet
from agenteconomy.bounty import BountyClient


class DiscoverBountiesInput(BaseModel):
    category: Optional[str] = Field(None, description="Filter by category")
    min_reward: Optional[int] = Field(None, description="Minimum reward in lovelace")
    limit: Optional[int] = Field(10, description="Max results to return")


class DiscoverBountiesTool(BaseTool):
    name: str = "discover_bounties"
    description: str = (
        "Discover available bounties on the AgentBounty marketplace. "
        "Use this to find tasks the agent can claim and earn ADA for completing. "
        "Returns a JSON list of bounties with their IDs, titles, categories, and rewards."
    )
    args_schema: Type[BaseModel] = DiscoverBountiesInput
    client: Any = None

    def _run(self, category: str | None = None, min_reward: int | None = None, limit: int = 10) -> str:
        params: dict[str, Any] = {}
        if category:
            params["category"] = category
        if min_reward:
            params["min_reward"] = min_reward
        params["limit"] = limit
        bounties = asyncio.run(self.client.discover_bounties(params))
        return json.dumps(bounties, default=str)


class GetBountySpecInput(BaseModel):
    bounty_id: str = Field(description="The bounty ID to get the spec for")


class GetBountySpecTool(BaseTool):
    name: str = "get_bounty_spec"
    description: str = (
        "Download the full task specification for a specific bounty. "
        "Use this after discovering bounties to understand exactly what work is needed. "
        "Returns JSON with title, description, instructions, and output format."
    )
    args_schema: Type[BaseModel] = GetBountySpecInput
    client: Any = None

    def _run(self, bounty_id: str) -> str:
        spec = asyncio.run(self.client.get_bounty_spec(bounty_id))
        return json.dumps(spec, default=str)


class ClaimBountyInput(BaseModel):
    bounty_id: str = Field(description="The bounty ID to claim")


class ClaimBountyTool(BaseTool):
    name: str = "claim_bounty"
    description: str = (
        "Claim a bounty on-chain so no other agent can take it. "
        "Use this when the agent has decided to work on a specific bounty. "
        "Returns the transaction hash confirming the claim."
    )
    args_schema: Type[BaseModel] = ClaimBountyInput
    client: Any = None

    def _run(self, bounty_id: str) -> str:
        result = asyncio.run(self.client.claim_bounty(bounty_id))
        return json.dumps({"tx_hash": result.tx_hash, "bounty_id": result.bounty_id})


class SubmitBountyWorkInput(BaseModel):
    bounty_id: str = Field(description="The bounty ID to submit work for")
    result_json: str = Field(description="The result JSON as a string")


class SubmitBountyWorkTool(BaseTool):
    name: str = "submit_bounty_work"
    description: str = (
        "Upload task result to IPFS and submit work on-chain. "
        "Use this after completing the task for a claimed bounty. "
        "Input must include the bounty_id and the result as a JSON string. "
        "Returns transaction hash and IPFS CID of the uploaded result."
    )
    args_schema: Type[BaseModel] = SubmitBountyWorkInput
    client: Any = None

    def _run(self, bounty_id: str, result_json: str) -> str:
        result_data = json.loads(result_json)
        result = asyncio.run(self.client.submit_work(bounty_id, result_data))
        return json.dumps({
            "tx_hash": result.tx_hash,
            "ipfs_cid": result.ipfs_cid,
            "bounty_id": result.bounty_id,
        })


class GetWalletBalanceTool(BaseTool):
    name: str = "get_wallet_balance"
    description: str = (
        "Check the current ADA balance of the agent wallet. "
        "Use this to verify the agent has enough funds before claiming bounties. "
        "Returns JSON with ADA amount, lovelace amount, and token balances."
    )
    wallet: Any = None

    def _run(self) -> str:
        balance = asyncio.run(self.wallet.get_balance())
        return json.dumps({
            "ada": balance.ada,
            "lovelace": balance.lovelace,
            "tokens": balance.tokens,
        }, default=str)


class GetActiveClaimsTool(BaseTool):
    name: str = "get_active_claims"
    description: str = (
        "List all bounties currently claimed by this agent. "
        "Use this to check what work the agent needs to complete. "
        "Returns a JSON list of active bounty claims."
    )
    client: Any = None

    def _run(self) -> str:
        bounties = asyncio.run(self.client.discover_bounties({"status": "Claimed"}))
        return json.dumps(bounties, default=str)


class CheckEligibilityInput(BaseModel):
    bounty_id: str = Field(description="The bounty ID to check eligibility for")


class CheckEligibilityTool(BaseTool):
    name: str = "check_bounty_eligibility"
    description: str = (
        "Check if this agent meets all requirements to claim a specific bounty. "
        "Use this before claiming to verify reputation score, whitelist, and funds. "
        "Returns JSON with eligible boolean and reason if not eligible."
    )
    args_schema: Type[BaseModel] = CheckEligibilityInput
    client: Any = None

    def _run(self, bounty_id: str) -> str:
        result = asyncio.run(self.client.check_eligibility(bounty_id))
        return json.dumps({
            "eligible": result.eligible,
            "reason": result.reason,
        })


def create_langchain_tools(
    wallet: AgentWallet,
    client: BountyClient,
) -> list[BaseTool]:
    """Create all 7 LangChain tools for AgentEconomy."""
    return [
        DiscoverBountiesTool(client=client),
        GetBountySpecTool(client=client),
        ClaimBountyTool(client=client),
        SubmitBountyWorkTool(client=client),
        GetWalletBalanceTool(wallet=wallet),
        GetActiveClaimsTool(client=client),
        CheckEligibilityTool(client=client),
    ]
