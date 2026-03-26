import { config } from "../config.js";

export async function uploadToIPFS(content: unknown): Promise<string> {
  const token = config.WEB3_STORAGE_TOKEN;
  if (!token) throw new Error("WEB3_STORAGE_TOKEN required");

  const body = JSON.stringify(content);
  const resp = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: new Blob([body], { type: "application/json" }),
  });

  if (!resp.ok) throw new Error(`IPFS upload failed: ${resp.status}`);
  const result = (await resp.json()) as { cid: string };
  return result.cid;
}

export async function fetchFromIPFS(cid: string): Promise<unknown> {
  const resp = await fetch(`https://w3s.link/ipfs/${cid}`);
  if (!resp.ok) throw new Error(`IPFS fetch failed: ${resp.status}`);
  return resp.json();
}
