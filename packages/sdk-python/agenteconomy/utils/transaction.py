"""Transaction utilities."""

from __future__ import annotations

import asyncio
import time
from typing import Any


async def wait_for_tx_confirmation(
    tx_hash: str,
    blockfrost_url: str,
    api_key: str,
    max_wait_ms: int = 120_000,
) -> None:
    """Poll Blockfrost until transaction is confirmed in a block."""
    import aiohttp

    start = time.monotonic()
    poll_interval = 3.0

    async with aiohttp.ClientSession() as session:
        while (time.monotonic() - start) * 1000 < max_wait_ms:
            async with session.get(
                f"{blockfrost_url}/txs/{tx_hash}",
                headers={"project_id": api_key},
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("block"):
                        return
            await asyncio.sleep(poll_interval)

    raise TimeoutError(f"Transaction {tx_hash} not confirmed within {max_wait_ms}ms")
