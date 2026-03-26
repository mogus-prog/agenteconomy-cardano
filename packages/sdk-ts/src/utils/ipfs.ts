// ─────────────────────────────────────────────────────────
// IPFS utilities — upload, fetch, verify
// ─────────────────────────────────────────────────────────

import { createHash } from "node:crypto";

export interface IPFSConfig {
  web3StorageToken?: string;
  gatewayUrl?: string;
}

const DEFAULT_GATEWAY = "https://w3s.link/ipfs";

export async function uploadToIPFS(
  content: object | string,
  filename: string,
  config?: IPFSConfig,
): Promise<string> {
  const token = config?.web3StorageToken ?? process.env["WEB3_STORAGE_TOKEN"];
  if (!token) {
    throw new Error("WEB3_STORAGE_TOKEN is required for IPFS upload");
  }

  const body = typeof content === "string" ? content : JSON.stringify(content);
  const blob = new Blob([body], { type: "application/json" });

  const response = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Name": filename,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { cid: string };
  return result.cid;
}

export async function fetchFromIPFS(
  cid: string,
  config?: IPFSConfig,
): Promise<unknown> {
  const gateway = config?.gatewayUrl ?? DEFAULT_GATEWAY;
  const url = `${gateway}/${cid}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IPFS fetch failed for ${cid}: ${response.status}`);
  }

  return response.json();
}

export async function verifyContentHash(
  cid: string,
  expectedHash: string,
  config?: IPFSConfig,
): Promise<boolean> {
  const gateway = config?.gatewayUrl ?? DEFAULT_GATEWAY;
  const url = `${gateway}/${cid}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IPFS fetch failed for ${cid}: ${response.status}`);
  }

  const content = await response.text();
  const hash = createHash("sha256").update(content).digest("hex");
  return hash === expectedHash;
}
