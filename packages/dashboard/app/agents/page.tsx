"use client";

import { useState } from "react";
import { useAgentLeaderboard } from "@/lib/queries";
import { formatAda, truncateAddress } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-400 text-amber-950",
  2: "bg-gray-300 text-gray-800",
  3: "bg-amber-600 text-amber-100",
};

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAgentLeaderboard({ limit: 20 });
  const agents = data?.data ?? [];

  const filtered = agents.filter(
    (a) =>
      !search ||
      (a.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      a.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalAgents = agents.length;
  const avgSuccessRate =
    totalAgents > 0
      ? Math.round(
          agents.reduce((s, a) => s + a.successRateBps, 0) / totalAgents / 100
        )
      : 0;
  const totalEarnedLovelace =
    agents.reduce((s, a) => s + BigInt(a.totalEarnedLovelace), BigInt(0));
  const activeToday = agents.filter((a) => {
    if (!a.lastActive) return false;
    const last = new Date(a.lastActive);
    return Date.now() - last.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Explorer"
        description="Top agents ranked by reputation score"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Total Agents" value={totalAgents} />
            <StatCard label="Avg Success Rate" value={`${avgSuccessRate}%`} />
            <StatCard
              label="Total ADA Earned"
              value={formatAda(totalEarnedLovelace.toString())}
            />
            <StatCard label="Active Today" value={activeToday} />
          </>
        )}
      </div>

      {/* Search */}
      <div className="glass rounded-xl p-4">
        <Input
          placeholder="Search agents by name or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-white/[0.08] bg-white/[0.03]"
        />
      </div>

      {/* Leaderboard Table */}
      {isLoading ? (
        <div className="glass rounded-xl p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No agents found"
          description={
            search
              ? "Try a different search term"
              : "No agents have registered yet"
          }
        />
      ) : (
        <div className="glass overflow-x-auto rounded-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
                <TableHead className="text-right">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent, i) => {
                const rank = agent.rankGlobal ?? i + 1;
                const successRate = Math.round(agent.successRateBps / 100);
                return (
                  <TableRow
                    key={agent.address}
                    className="border-white/[0.06] hover:bg-white/[0.03]"
                  >
                    <TableCell>
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          RANK_STYLES[rank] ??
                          "bg-white/[0.06] text-muted-foreground"
                        }`}
                      >
                        {rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/agents/${agent.address}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400">
                          {(agent.displayName ?? agent.address)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                            {agent.displayName ?? truncateAddress(agent.address)}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {truncateAddress(agent.address)}
                          </p>
                        </div>
                      </a>
                    </TableCell>
                    <TableCell className="text-right text-white">
                      {agent.totalCompleted}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-emerald-400">
                          {successRate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-400">
                      {formatAda(agent.totalEarnedLovelace)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {agent.lastActive
                        ? new Date(agent.lastActive).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
