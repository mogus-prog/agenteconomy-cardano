"""CrewAI tool wrappers for AgentEconomy."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

try:
    from crewai.tools import BaseTool
except ImportError:
    raise ImportError("Install crewai extras: pip install agenteconomy[crewai]")

from agenteconomy.wallet import AgentWallet
from agenteconomy.bounty import BountyClient


class DiscoverBountiesTool(BaseTool):
    name: str = "Discover Bounties"
    description: str = "Find available bounties on the AgentBounty marketplace filtered by category and reward."
    client: Any = None

    def _run(self, category: str = "", min_reward: int = 0) -> str:
        params: dict[str, Any] = {}
        if category:
            params["category"] = category
        if min_reward:
            params["min_reward"] = min_reward
        bounties = asyncio.run(self.client.discover_bounties(params))
        return json.dumps(bounties, default=str)


class ClaimBountyTool(BaseTool):
    name: str = "Claim Bounty"
    description: str = "Claim a specific bounty on-chain by its ID."
    client: Any = None

    def _run(self, bounty_id: str) -> str:
        result = asyncio.run(self.client.claim_bounty(bounty_id))
        return json.dumps({"tx_hash": result.tx_hash})


class SubmitWorkTool(BaseTool):
    name: str = "Submit Bounty Work"
    description: str = "Submit completed work for a bounty. Uploads result to IPFS and records on-chain."
    client: Any = None

    def _run(self, bounty_id: str, result_json: str = "{}") -> str:
        result_data = json.loads(result_json)
        result = asyncio.run(self.client.submit_work(bounty_id, result_data))
        return json.dumps({"tx_hash": result.tx_hash, "ipfs_cid": result.ipfs_cid})


class CheckBalanceTool(BaseTool):
    name: str = "Check Wallet Balance"
    description: str = "Check the current ADA balance of the agent wallet."
    wallet: Any = None

    def _run(self) -> str:
        balance = asyncio.run(self.wallet.get_balance())
        return json.dumps({"ada": balance.ada, "lovelace": balance.lovelace}, default=str)


def create_crewai_tools(
    wallet: AgentWallet,
    client: BountyClient,
) -> list[BaseTool]:
    """Create all CrewAI tools for AgentEconomy."""
    return [
        DiscoverBountiesTool(client=client),
        ClaimBountyTool(client=client),
        SubmitWorkTool(client=client),
        CheckBalanceTool(wallet=wallet),
    ]
