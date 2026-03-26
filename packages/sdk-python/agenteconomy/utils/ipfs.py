"""IPFS upload/download utilities."""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any

import aiohttp


DEFAULT_GATEWAY = "https://w3s.link/ipfs"


async def upload_to_ipfs(
    content: dict | str,
    filename: str,
    token: str | None = None,
) -> str:
    """Upload content to IPFS via web3.storage. Returns CIDv1."""
    api_token = token or os.environ.get("WEB3_STORAGE_TOKEN")
    if not api_token:
        raise ValueError("WEB3_STORAGE_TOKEN is required for IPFS upload")

    body = content if isinstance(content, str) else json.dumps(content)

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.web3.storage/upload",
            headers={
                "Authorization": f"Bearer {api_token}",
                "X-Name": filename,
            },
            data=body.encode(),
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"IPFS upload failed: {resp.status}")
            result = await resp.json()
            return result["cid"]


async def fetch_from_ipfs(
    cid: str,
    gateway: str = DEFAULT_GATEWAY,
) -> Any:
    """Fetch and parse JSON from IPFS."""
    url = f"{gateway}/{cid}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise RuntimeError(f"IPFS fetch failed for {cid}: {resp.status}")
            return await resp.json()


async def verify_content_hash(
    cid: str,
    expected_hash: str,
    gateway: str = DEFAULT_GATEWAY,
) -> bool:
    """Verify SHA-256 of IPFS content matches expected hash."""
    url = f"{gateway}/{cid}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise RuntimeError(f"IPFS fetch failed for {cid}: {resp.status}")
            content = await resp.text()
            computed = hashlib.sha256(content.encode()).hexdigest()
            return computed == expected_hash
