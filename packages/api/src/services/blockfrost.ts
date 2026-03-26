import { config } from "../config.js";
import { cacheGet, cacheSet } from "../lib/redis.js";

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3, baseDelayMs: 1000 };

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retry: RetryOptions = DEFAULT_RETRY,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          project_id: config.BLOCKFROST_API_KEY,
          ...options.headers,
        },
      });

      if (response.ok || response.status === 404) return response;

      if (response.status === 429) {
        const delayMs = retry.baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      throw new Error(`Blockfrost API error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retry.maxRetries) {
        const delayMs = retry.baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError ?? new Error("Blockfrost request failed");
}

export async function getAddressUtxos(address: string): Promise<unknown[]> {
  const cacheKey = `utxos:${address}`;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) return cached;

  const resp = await fetchWithRetry(
    `${config.BLOCKFROST_BASE_URL}/addresses/${address}/utxos`,
  );
  if (resp.status === 404) return [];
  const data = (await resp.json()) as unknown[];
  await cacheSet(cacheKey, data, 30);
  return data;
}

export async function getTxInfo(txHash: string): Promise<unknown | null> {
  const cacheKey = `tx:${txHash}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const resp = await fetchWithRetry(
    `${config.BLOCKFROST_BASE_URL}/txs/${txHash}`,
  );
  if (resp.status === 404) return null;
  const data: unknown = await resp.json();
  await cacheSet(cacheKey, data, 86400);
  return data;
}

export async function submitTx(txCbor: string): Promise<string> {
  const resp = await fetchWithRetry(
    `${config.BLOCKFROST_BASE_URL}/tx/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/cbor" },
      body: Buffer.from(txCbor, "hex"),
    },
  );
  const result = (await resp.json()) as string;
  return result;
}

export async function getProtocolParams(): Promise<unknown> {
  const cacheKey = "protocol_params";
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const resp = await fetchWithRetry(
    `${config.BLOCKFROST_BASE_URL}/epochs/latest/parameters`,
  );
  const data: unknown = await resp.json();
  await cacheSet(cacheKey, data, 3600);
  return data;
}

export async function getAddressTransactions(
  address: string,
  page: number = 1,
  count: number = 20,
): Promise<unknown[]> {
  const resp = await fetchWithRetry(
    `${config.BLOCKFROST_BASE_URL}/addresses/${address}/transactions?page=${page}&count=${count}`,
  );
  if (resp.status === 404) return [];
  return resp.json() as Promise<unknown[]>;
}
