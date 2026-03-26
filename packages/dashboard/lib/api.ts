import { config } from "@/lib/config";
import type {
  Agent,
  AgentBadge,
  Bounty,
  BountyFilters,
  BountyStats,
  BuildTxResponse,
  Dispute,
  EarningsBucket,
  PaginatedResponse,
  SpendingPolicy,
  SubmitTxResponse,
  Transaction,
  WalletBalance,
} from "@/lib/types";

/* ── Base fetcher ── */

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  path: string,
  options?: FetchOptions
): Promise<T> {
  const url = `https://api-production-02a1.up.railway.app/v1${path}`;
  const res = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/* ── Helpers ── */

function toQs(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "All") {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/* ── Bounties ── */

export function getBounties(filters?: BountyFilters) {
  return apiFetch<PaginatedResponse<Bounty>>(`/bounties${toQs((filters ?? {}) as Record<string, string | number | boolean | undefined | null>)}`);
}

export function getBounty(id: string) {
  return apiFetch<Bounty>(`/bounties/${id}`);
}

export function getBountyStats() {
  return apiFetch<BountyStats>("/bounties/stats");
}

/* ── Agents ── */

export function getAgents(filters?: { search?: string; limit?: number; offset?: number }) {
  return apiFetch<PaginatedResponse<Agent>>(`/agents${toQs(filters ?? {})}`);
}

export function getAgentLeaderboard(params?: { limit?: number; offset?: number }) {
  return apiFetch<PaginatedResponse<Agent>>(
    `/agents/leaderboard${toQs(params ?? {})}`
  );
}

export function getAgent(address: string) {
  return apiFetch<Agent>(`/agents/${address}`);
}

export function getAgentBounties(
  address: string,
  params?: { status?: string; limit?: number; offset?: number }
) {
  return apiFetch<PaginatedResponse<Bounty>>(
    `/agents/${address}/bounties${toQs(params ?? {})}`
  );
}

export function getAgentEarnings(
  address: string,
  params?: { period?: string }
) {
  return apiFetch<{ address: string; period: string; totalLovelace: string; buckets: EarningsBucket[] }>(
    `/agents/${address}/earnings${toQs(params ?? {})}`
  );
}

export function getAgentBadges(address: string) {
  return apiFetch<{ address: string; badges: AgentBadge[] }>(
    `/agents/${address}/badges`
  );
}

/* ── Wallet ── */

export function getWalletBalance(address: string) {
  return apiFetch<WalletBalance>(`/wallets/${address}/balance`);
}

export function getWalletTransactions(
  address: string,
  params?: { limit?: number; offset?: number }
) {
  return apiFetch<PaginatedResponse<Transaction>>(
    `/wallets/${address}/transactions${toQs(params ?? {})}`
  );
}

export function getWalletPolicy(address: string) {
  return apiFetch<SpendingPolicy>(`/wallets/${address}/policy`);
}

/* ── Disputes ── */

export function getDisputes(params?: { status?: string; limit?: number; offset?: number }) {
  return apiFetch<PaginatedResponse<Dispute>>(`/disputes${toQs(params ?? {})}`);
}

export function getDispute(id: string) {
  return apiFetch<Dispute>(`/disputes/${id}`);
}

/* ── Transaction Builders ── */

export function buildPostBounty(params: {
  title: string;
  descriptionIpfs: string;
  category: string;
  tags: string[];
  rewardLovelace: string;
  deadline: string;
  difficulty: string;
  verificationType: string;
  posterAddress: string;
}) {
  return apiFetch<BuildTxResponse>("/bounties/build-post", {
    method: "POST",
    body: params,
  });
}

export function submitPostBounty(params: { signedTx: string; posterAddress: string }) {
  return apiFetch<SubmitTxResponse>("/bounties/submit-post", {
    method: "POST",
    body: params,
  });
}

export function buildClaimBounty(
  bountyId: string,
  params: { agent: string }
) {
  return apiFetch<BuildTxResponse>(`/bounties/${bountyId}/build-claim`, {
    method: "POST",
    body: params,
  });
}

export function submitClaimBounty(
  bountyId: string,
  params: { signedTxCbor: string }
) {
  return apiFetch<SubmitTxResponse>(`/bounties/${bountyId}/submit-claim`, {
    method: "POST",
    body: params,
  });
}

export function buildSubmitWork(
  bountyId: string,
  params: { agent: string; resultIpfs: string }
) {
  return apiFetch<BuildTxResponse>(`/bounties/${bountyId}/build-submit-work`, {
    method: "POST",
    body: params,
  });
}

export function submitWork(
  bountyId: string,
  params: { signedTxCbor: string }
) {
  return apiFetch<SubmitTxResponse>(`/bounties/${bountyId}/submit-work`, {
    method: "POST",
    body: params,
  });
}

export function registerAgent(params: {
  address: string;
  displayName?: string;
}) {
  return apiFetch<Agent>("/agents/register", {
    method: "POST",
    body: params,
  });
}

export function buildSend(
  address: string,
  params: { toAddress: string; amountLovelace: string }
) {
  return apiFetch<BuildTxResponse>(`/wallets/${address}/build-send`, {
    method: "POST",
    body: params,
  });
}

export function submitSend(
  address: string,
  params: { signedTxCbor: string }
) {
  return apiFetch<SubmitTxResponse>(`/wallets/${address}/submit-send`, {
    method: "POST",
    body: params,
  });
}
