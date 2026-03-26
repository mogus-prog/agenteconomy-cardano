"""AutoGen adapter for AgentEconomy tools."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from agenteconomy.wallet import AgentWallet
from agenteconomy.bounty import BountyClient


def create_autogen_tools(
    wallet: AgentWallet,
    client: BountyClient,
) -> list[dict[str, Any]]:
    """Create AutoGen-compatible tool definitions for AgentEconomy.

    Returns a list of dicts suitable for use with autogen AssistantAgent's
    function_map or tool registration.
    """

    def discover_bounties(
        category: str = "",
        min_reward: int = 0,
        limit: int = 10,
    ) -> str:
        """Find available bounties on the AgentBounty marketplace."""
        params: dict[str, Any] = {"limit": limit}
        if category:
            params["category"] = category
        if min_reward:
            params["min_reward"] = min_reward
        bounties = asyncio.run(client.discover_bounties(params))
        return json.dumps(bounties, default=str)

    def get_bounty_spec(bounty_id: str) -> str:
        """Download the full task specification for a bounty."""
        spec = asyncio.run(client.get_bounty_spec(bounty_id))
        return json.dumps(spec, default=str)

    def claim_bounty(bounty_id: str) -> str:
        """Claim a bounty on-chain."""
        result = asyncio.run(client.claim_bounty(bounty_id))
        return json.dumps({"tx_hash": result.tx_hash, "bounty_id": result.bounty_id})

    def submit_work(bounty_id: str, result_json: str) -> str:
        """Submit completed work for a bounty."""
        result_data = json.loads(result_json)
        result = asyncio.run(client.submit_work(bounty_id, result_data))
        return json.dumps({"tx_hash": result.tx_hash, "ipfs_cid": result.ipfs_cid})

    def get_balance() -> str:
        """Check the agent wallet ADA balance."""
        balance = asyncio.run(wallet.get_balance())
        return json.dumps({"ada": balance.ada, "lovelace": balance.lovelace}, default=str)

    def check_eligibility(bounty_id: str) -> str:
        """Check if the agent can claim a bounty."""
        result = asyncio.run(client.check_eligibility(bounty_id))
        return json.dumps({"eligible": result.eligible, "reason": result.reason})

    return [
        {
            "name": "discover_bounties",
            "description": "Find available bounties on the AgentBounty marketplace",
            "function": discover_bounties,
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Filter by category"},
                    "min_reward": {"type": "integer", "description": "Min reward in lovelace"},
                    "limit": {"type": "integer", "description": "Max results"},
                },
            },
        },
        {
            "name": "get_bounty_spec",
            "description": "Download the full task specification for a bounty",
            "function": get_bounty_spec,
            "parameters": {
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "string", "description": "The bounty ID"},
                },
                "required": ["bounty_id"],
            },
        },
        {
            "name": "claim_bounty",
            "description": "Claim a bounty on-chain",
            "function": claim_bounty,
            "parameters": {
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "string", "description": "The bounty ID"},
                },
                "required": ["bounty_id"],
            },
        },
        {
            "name": "submit_work",
            "description": "Submit completed work for a bounty",
            "function": submit_work,
            "parameters": {
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "string"},
                    "result_json": {"type": "string"},
                },
                "required": ["bounty_id", "result_json"],
            },
        },
        {
            "name": "get_balance",
            "description": "Check agent wallet ADA balance",
            "function": get_balance,
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "check_eligibility",
            "description": "Check if agent can claim a bounty",
            "function": check_eligibility,
            "parameters": {
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "string"},
                },
                "required": ["bounty_id"],
            },
        },
    ]
