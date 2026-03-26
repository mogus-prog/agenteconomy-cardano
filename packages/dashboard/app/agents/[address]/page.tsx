"use client";

import { useAgent, useAgentBounties, useAgentEarnings, useAgentBadges } from "@/lib/queries";
import { formatAda, lovelaceToAda, truncateAddress } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { AddressDisplay } from "@/components/address-display";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgentProfilePageProps {
  params: { address: string };
}

export default function AgentProfilePage({ params }: AgentProfilePageProps) {
  const address = decodeURIComponent(params.address);
  const { data: agent, isLoading: loadingAgent } = useAgent(address);
  const { data: bountiesData, isLoading: loadingBounties } = useAgentBounties(address);
  const { data: earningsData, isLoading: loadingEarnings } = useAgentEarnings(address);
  const { data: badgesData, isLoading: loadingBadges } = useAgentBadges(address);

  const bounties = bountiesData?.data ?? [];
  const buckets = earningsData?.buckets ?? [];
  const badges = badgesData?.badges ?? [];

  const maxEarning = buckets.length > 0
    ? Math.max(...buckets.map((e) => lovelaceToAda(e.totalLovelace)), 1)
    : 1;

  const successRate = agent ? Math.round(agent.successRateBps / 100) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <a href="/agents" className="hover:text-white transition-colors">
          Agents
        </a>
        <span className="mx-2">/</span>
        <span className="font-mono">{truncateAddress(address)}</span>
      </nav>

      {/* Agent Header Card */}
      {loadingAgent ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : agent ? (
        <div className="glass rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20 text-3xl font-bold text-indigo-400">
              {(agent.displayName ?? agent.address).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gradient">
                  {agent.displayName ?? truncateAddress(agent.address)}
                </h1>
                {agent.isVerified && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Verified
                  </Badge>
                )}
              </div>
              <div className="mt-1">
                <AddressDisplay address={address} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-indigo-400">
                {agent.rankGlobal ? `#${agent.rankGlobal}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Global Rank</p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Agent not found" description="This agent address does not exist in our records." />
      )}

      {/* Stats Grid */}
      {loadingAgent ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : agent ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bounties Completed" value={agent.totalCompleted} />
          <StatCard label="Success Rate" value={`${successRate}%`} />
          <StatCard label="Total Earned" value={formatAda(agent.totalEarnedLovelace)} />
          <StatCard label="Global Rank" value={agent.rankGlobal ? `#${agent.rankGlobal}` : "—"} />
        </div>
      ) : null}

      {/* Badges Section */}
      {loadingBadges ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : badges.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Badges</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((badge) => (
              <div key={badge.name} className="glass rounded-xl p-4 text-center">
                <div className="mb-2 text-2xl">&#127942;</div>
                <p className="text-sm font-semibold text-white">{badge.name}</p>
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Earnings Chart */}
      <div className="glass rounded-xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Monthly Earnings</h2>
          <span className="text-xs text-muted-foreground">
            Last {buckets.length} months
          </span>
        </div>
        {loadingEarnings ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : buckets.length > 0 ? (
          <div className="flex items-end gap-3" style={{ height: "160px" }}>
            {buckets.map((bucket) => {
              const adaAmount = lovelaceToAda(bucket.totalLovelace);
              return (
                <div
                  key={bucket.period}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium font-mono text-amber-400">
                    {formatAda(bucket.totalLovelace)}
                  </span>
                  <div
                    className="w-full rounded-t bg-amber-400/60 hover:bg-amber-400/80 transition-colors"
                    style={{
                      height: `${Math.max((adaAmount / maxEarning) * 120, 4)}px`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {bucket.period}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No earnings data available
          </p>
        )}
      </div>

      {/* Bounty History */}
      <div className="glass rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Bounty History
        </h2>
        {loadingBounties ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : bounties.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reward</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bounties.map((b) => (
                <TableRow
                  key={b.id}
                  className="border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <TableCell>
                    <a
                      href={`/bounties/${b.id}`}
                      className="font-medium text-white hover:text-indigo-400 transition-colors"
                    >
                      {b.title}
                    </a>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-400">
                    {formatAda(b.rewardLovelace)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(b.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No bounties yet" description="This agent hasn't completed any bounties." />
        )}
      </div>
    </div>
  );
}
