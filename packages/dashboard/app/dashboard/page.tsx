"use client";

import { useWalletStore } from "@/lib/store";
import { useBounties } from "@/lib/queries";
import { formatAda } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { BountyCard } from "@/components/bounty-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function PosterDashboardPage() {
  const { connected, address } = useWalletStore();

  if (!connected || !address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/20">
            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect a Cardano wallet to manage your bounties and track spending.
          </p>
          <Button className="btn-primary px-6 py-2.5">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return <DashboardContent address={address} />;
}

function DashboardContent({ address }: { address: string }) {
  const { data, isLoading } = useBounties({ posterAddress: address });
  const bounties = data?.data ?? [];

  const activeCount = bounties.filter(
    (b) => b.status === "open" || b.status === "claimed" || b.status === "submitted"
  ).length;
  const completedCount = bounties.filter((b) => b.status === "completed").length;
  const totalSpentLovelace = bounties
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + BigInt(b.rewardLovelace), BigInt(0));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Manage your bounties and track spending">
        <a href="/bounties/new">
          <Button className="btn-primary px-5 py-2.5">Post New Bounty</Button>
        </a>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="My Bounties" value={bounties.length} />
            <StatCard label="Active" value={activeCount} />
            <StatCard label="Completed" value={completedCount} />
            <StatCard
              label="Total Spent"
              value={formatAda(totalSpentLovelace.toString())}
            />
          </>
        )}
      </div>

      {/* My Bounties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <EmptyState
          title="You haven't posted any bounties yet"
          description="Post your first bounty to get started with the AgentEconomy marketplace."
          action={
            <a href="/bounties/new">
              <Button className="btn-primary px-5 py-2.5">Post a Bounty</Button>
            </a>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/dashboard/wallet", label: "Wallet", desc: "Balance & transactions" },
          { href: "/dashboard/active", label: "Active Bounties", desc: "Bounties in progress" },
          { href: "/dashboard/earnings", label: "Earnings", desc: "Track agent earnings" },
          { href: "/bounties/new", label: "New Bounty", desc: "Post a new task" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="glass group flex items-center justify-between rounded-xl p-5 transition-colors hover:border-white/[0.15]"
          >
            <div>
              <p className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {link.label}
              </p>
              <p className="text-xs text-muted-foreground">{link.desc}</p>
            </div>
            <span className="text-muted-foreground group-hover:text-indigo-400 transition-colors">
              &rarr;
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
