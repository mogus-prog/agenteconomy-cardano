"use client";

import { useWalletStore } from "@/lib/store";
import { useAgent, useAgentEarnings, useAgentBounties } from "@/lib/queries";
import { useRegisterAgent } from "@/lib/mutations";
import { formatAda, lovelaceToAda, cardanoscanUrl, truncateAddress } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EarningsPage() {
  const { connected, address } = useWalletStore();

  if (!connected || !address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect your wallet to view your earnings.
          </p>
          <Button className="btn-primary px-6 py-2.5">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return <EarningsContent address={address} />;
}

function EarningsContent({ address }: { address: string }) {
  const { data: agent, isLoading: loadingAgent } = useAgent(address);
  const { data: earningsData, isLoading: loadingEarnings } = useAgentEarnings(address);
  const { data: bountiesData, isLoading: loadingBounties } = useAgentBounties(address, {
    status: "completed",
  });
  const registerAgent = useRegisterAgent();

  const buckets = earningsData?.buckets ?? [];
  const completedBounties = bountiesData?.data ?? [];

  // If no agent found, show registration prompt
  if (!loadingAgent && !agent) {
    return (
      <div className="space-y-6">
        <PageHeader title="Earnings" description="Track your agent earnings from completed bounties" />
        <div className="glass max-w-lg mx-auto rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/20">
            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Register as an Agent</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Register as an agent to start earning ADA from bounties and track your earnings here.
          </p>
          <Button
            className="btn-primary px-6 py-2.5"
            onClick={() =>
              registerAgent.mutate({
                address,
                displayName: "My Agent",
              })
            }
            disabled={registerAgent.isPending}
          >
            {registerAgent.isPending ? "Registering..." : "Register Agent"}
          </Button>
        </div>
      </div>
    );
  }

  const lifetimeEarned = agent?.totalEarnedLovelace ?? "0";
  const thisMonth =
    buckets.length > 0 ? buckets[buckets.length - 1].totalLovelace : "0";
  const avgPerBounty =
    (agent?.totalCompleted ?? 0) > 0
      ? String(
          Math.floor(
            Number(BigInt(lifetimeEarned)) / (agent?.totalCompleted ?? 1)
          )
        )
      : "0";
  const pendingLovelace = completedBounties
    .filter((b) => !b.completeTxHash)
    .reduce((s, b) => s + BigInt(b.rewardLovelace), BigInt(0));

  const maxBucket = buckets.length > 0
    ? Math.max(...buckets.map((b) => lovelaceToAda(b.totalLovelace)), 1)
    : 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="Your agent earnings from completed bounties" />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingAgent ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Lifetime Earned" value={formatAda(lifetimeEarned)} />
            <StatCard label="This Month" value={formatAda(thisMonth)} />
            <StatCard label="Average per Bounty" value={formatAda(avgPerBounty)} />
            <StatCard label="Pending" value={formatAda(pendingLovelace.toString())} />
          </>
        )}
      </div>

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
              const ada = lovelaceToAda(bucket.totalLovelace);
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
                      height: `${Math.max((ada / maxBucket) * 120, 4)}px`,
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
            No earnings data yet
          </p>
        )}
      </div>

      {/* Payout History */}
      <div className="glass rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Payout History</h2>
        {loadingBounties ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : completedBounties.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead>Bounty</TableHead>
                <TableHead className="text-right">Reward</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedBounties.map((b) => (
                <TableRow
                  key={b.id}
                  className="border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <TableCell className="font-medium text-white">
                    <a
                      href={`/bounties/${b.id}`}
                      className="hover:text-indigo-400 transition-colors"
                    >
                      {b.title}
                    </a>
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">
                    +{formatAda(b.rewardLovelace)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.completedAt
                      ? new Date(b.completedAt).toLocaleDateString()
                      : new Date(b.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {b.completeTxHash ? (
                      <a
                        href={cardanoscanUrl(b.completeTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {truncateAddress(b.completeTxHash)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No payouts yet" description="Complete bounties to start earning." />
        )}
      </div>
    </div>
  );
}
