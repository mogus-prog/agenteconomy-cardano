"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getBounties,
  getBounty,
  getBountyStats,
  getAgents,
  getAgentLeaderboard,
  getAgent,
  getAgentBounties,
  getAgentEarnings,
  getAgentBadges,
  getWalletBalance,
  getWalletTransactions,
  getWalletPolicy,
  getDisputes,
  getDispute,
} from "@/lib/api";
import type { BountyFilters } from "@/lib/types";

/* ── Bounties ── */

export function useBounties(filters?: BountyFilters) {
  return useQuery({
    queryKey: ["bounties", filters],
    queryFn: () => getBounties(filters),
  });
}

export function useBounty(id: string | undefined) {
  return useQuery({
    queryKey: ["bounty", id],
    queryFn: () => getBounty(id!),
    enabled: !!id,
  });
}

export function useBountyStats() {
  return useQuery({
    queryKey: ["bountyStats"],
    queryFn: getBountyStats,
  });
}

/* ── Agents ── */

export function useAgents(params?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["agents", params],
    queryFn: () => getAgents(params),
  });
}

export function useAgentLeaderboard(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["agentLeaderboard", params],
    queryFn: () => getAgentLeaderboard(params),
  });
}

export function useAgent(address: string | undefined | null) {
  return useQuery({
    queryKey: ["agent", address],
    queryFn: () => getAgent(address!),
    enabled: !!address,
  });
}

export function useAgentBounties(
  address: string | undefined | null,
  params?: { status?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["agentBounties", address, params],
    queryFn: () => getAgentBounties(address!, params),
    enabled: !!address,
  });
}

export function useAgentEarnings(
  address: string | undefined | null,
  params?: { period?: string }
) {
  return useQuery({
    queryKey: ["agentEarnings", address, params],
    queryFn: () => getAgentEarnings(address!, params),
    enabled: !!address,
  });
}

export function useAgentBadges(address: string | undefined | null) {
  return useQuery({
    queryKey: ["agentBadges", address],
    queryFn: () => getAgentBadges(address!),
    enabled: !!address,
  });
}

/* ── Wallet ── */

export function useWalletBalance(address: string | undefined | null) {
  return useQuery({
    queryKey: ["walletBalance", address],
    queryFn: () => getWalletBalance(address!),
    enabled: !!address,
  });
}

export function useWalletTransactions(
  address: string | undefined | null,
  params?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["walletTransactions", address, params],
    queryFn: () => getWalletTransactions(address!, params),
    enabled: !!address,
  });
}

export function useWalletPolicy(address: string | undefined | null) {
  return useQuery({
    queryKey: ["walletPolicy", address],
    queryFn: () => getWalletPolicy(address!),
    enabled: !!address,
  });
}

/* ── Disputes ── */

export function useDisputes(params?: { status?: string }) {
  return useQuery({
    queryKey: ["disputes", params],
    queryFn: () => getDisputes(params),
  });
}

export function useDispute(id: string | undefined) {
  return useQuery({
    queryKey: ["dispute", id],
    queryFn: () => getDispute(id!),
    enabled: !!id,
  });
}
