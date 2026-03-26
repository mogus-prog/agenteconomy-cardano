"use client";

import { useWalletStore } from "@/lib/store";
import { useBounties } from "@/lib/queries";
import { formatAda } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { AddressDisplay } from "@/components/address-display";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bounty } from "@/lib/types";

export default function ActiveBountiesPage() {
  const { connected, address } = useWalletStore();

  if (!connected || !address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect your wallet to see active bounties.
          </p>
          <Button className="btn-primary px-6 py-2.5">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return <ActiveContent address={address} />;
}

function ActiveContent({ address }: { address: string }) {
  const { data: agentData, isLoading: loadingAgent } = useBounties({
    agentAddress: address,
    status: "claimed",
  });
  const { data: agentSubmitted, isLoading: loadingSubmitted } = useBounties({
    agentAddress: address,
    status: "submitted",
  });
  const { data: posterData, isLoading: loadingPoster } = useBounties({
    posterAddress: address,
    status: "claimed",
  });
  const { data: posterSubmitted, isLoading: loadingPosterSubmitted } = useBounties({
    posterAddress: address,
    status: "submitted",
  });

  const isLoading = loadingAgent || loadingSubmitted || loadingPoster || loadingPosterSubmitted;

  const asAgent = [
    ...(agentData?.data ?? []),
    ...(agentSubmitted?.data ?? []),
  ];
  const asPoster = [
    ...(posterData?.data ?? []),
    ...(posterSubmitted?.data ?? []),
  ];

  const hasNone = asAgent.length === 0 && asPoster.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Bounties"
        description={`${asAgent.length + asPoster.length} bounties in progress`}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : hasNone ? (
        <EmptyState
          title="No active bounties"
          description="Browse available bounties to get started."
          action={
            <a href="/bounties">
              <Button className="btn-primary px-5 py-2.5">Browse Bounties</Button>
            </a>
          }
        />
      ) : (
        <>
          {/* As Agent */}
          {asAgent.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">As Agent</h2>
              <div className="space-y-4">
                {asAgent.map((bounty) => (
                  <ActiveBountyCard
                    key={bounty.id}
                    bounty={bounty}
                    role="agent"
                  />
                ))}
              </div>
            </section>
          )}

          {/* As Poster */}
          {asPoster.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-white">As Poster</h2>
              <div className="space-y-4">
                {asPoster.map((bounty) => (
                  <ActiveBountyCard
                    key={bounty.id}
                    bounty={bounty}
                    role="poster"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ActiveBountyCard({
  bounty,
  role,
}: {
  bounty: Bounty;
  role: "agent" | "poster";
}) {
  return (
    <div className="glass rounded-xl p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={bounty.status} />
          </div>
          <h3 className="text-lg font-semibold text-white">
            <a
              href={`/bounties/${bounty.id}`}
              className="hover:text-indigo-400 transition-colors"
            >
              {bounty.title}
            </a>
          </h3>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {role === "agent" && bounty.posterAddress && (
              <AddressDisplay address={bounty.posterAddress} label="Posted by" />
            )}
            {role === "poster" && bounty.agentAddress && (
              <AddressDisplay address={bounty.agentAddress} label="Claimed by" />
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-amber-400">
            {formatAda(bounty.rewardLovelace)}
          </p>
          <p className="text-xs text-muted-foreground">in escrow</p>
        </div>
      </div>

      {/* Countdown + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Deadline:</span>
          <CountdownTimer deadline={bounty.deadline} />
        </div>
        <div className="flex gap-2">
          {role === "agent" && bounty.status === "claimed" && (
            <Button className="btn-primary px-4 py-2 text-sm">
              Submit Work
            </Button>
          )}
          {role === "poster" && bounty.status === "submitted" && (
            <>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm rounded-lg">
                Approve & Pay
              </Button>
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 text-sm">
                Dispute
              </Button>
            </>
          )}
          <a href={`/bounties/${bounty.id}`}>
            <Button variant="outline" className="border-white/[0.08] px-4 py-2 text-sm">
              View Details
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
