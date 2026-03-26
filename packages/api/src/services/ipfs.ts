import { config } from "../config.js";
import { cacheGet, cacheSet } from "../lib/redis.js";

// ---------------------------------------------------------------------------
// IPFS Upload via Pinata (pinJSONToIPFS / pinFileToIPFS)
// Falls back to WEB3_STORAGE_TOKEN if Pinata keys are not set.
// ---------------------------------------------------------------------------

const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://w3s.link/ipfs",
  "https://dweb.link/ipfs",
];
const IPFS_CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Upload JSON or text content to IPFS via Pinata.
 * Returns the CID (IpfsHash) string.
 */
export async function uploadToIPFS(
  content: object | string,
  filename?: string,
): Promise<string> {
  const apiKey = config.PINATA_API_KEY;
  const secretKey = config.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error(
      "PINATA_API_KEY and PINATA_SECRET_KEY are required for IPFS uploads",
    );
  }

  const jsonContent = typeof content === "string" ? { text: content } : content;

  const payload = {
    pinataContent: jsonContent,
    pinataMetadata: {
      name: filename ?? `botbrained-${Date.now()}.json`,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };

  const resp = await fetch(PINATA_JSON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "unknown");
    throw new Error(`Pinata upload failed (${resp.status}): ${errText}`);
  }

  const result = (await resp.json()) as { IpfsHash: string };
  return result.IpfsHash;
}

/**
 * Fetch content from IPFS via public gateways.
 * Results are cached in Redis for 1 hour.
 */
export async function fetchFromIPFS(cid: string): Promise<unknown> {
  // Check Redis cache first
  const cacheKey = `ipfs:${cid}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Try each gateway in order
  let lastError: Error | null = null;
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const resp = await fetch(`${gateway}/${cid}`, {
        signal: AbortSignal.timeout(15_000), // 15s timeout per gateway
      });
      if (!resp.ok) {
        lastError = new Error(`Gateway ${gateway} returned ${resp.status}`);
        continue;
      }
      const data: unknown = await resp.json();

      // Cache the result
      await cacheSet(cacheKey, data, IPFS_CACHE_TTL_SECONDS);

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw new Error(
    `IPFS fetch failed for CID ${cid} from all gateways: ${lastError?.message ?? "unknown"}`,
  );
}
