"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useBounty } from "@/lib/queries";
import { useWalletStore } from "@/lib/store";
import { formatAda, cardanoscanUrl, truncateAddress } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { AddressDisplay } from "@/components/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4 bg-white/[0.06]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full bg-white/[0.06]" />
          <Skeleton className="h-24 w-full bg-white/[0.06]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full bg-white/[0.06]" />
          <Skeleton className="h-24 w-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="mb-2 text-6xl font-bold text-slate-600">404</p>
      <h2 className="mb-2 text-xl font-semibold text-slate-200">Bounty Not Found</h2>
      <p className="mb-6 text-sm text-muted-foreground">This bounty does not exist or has been removed.</p>
      <Link href="/bounties" className="btn-primary px-5 py-2.5 text-sm">
        Back to Bounties
      </Link>
    </div>
  );
}

interface TimelineItem {
  label: string;
  txHash?: string;
  active: boolean;
}

function TxTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Transaction History
      </h3>
      <div className="relative space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  item.txHash
                    ? "bg-emerald-400"
                    : item.active
                    ? "bg-indigo-400 animate-pulse"
                    : "bg-slate-700"
                }`}
              />
              {i < items.length - 1 && (
                <div className="mt-1 h-6 w-px bg-slate-700" />
              )}
            </div>
            <div className="-mt-0.5">
              <p className={`text-sm font-medium ${item.txHash ? "text-slate-200" : "text-slate-500"}`}>
                {item.label}
              </p>
              {item.txHash && (
                <a
                  href={cardanoscanUrl(item.txHash, "transaction")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  {truncateAddress(item.txHash, 10, 8)}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BountyDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: bounty, isLoading, error } = useBounty(params.id);
  const { connected, address } = useWalletStore();

  if (isLoading) return <LoadingSkeleton />;
  if (error || !bounty) return <NotFound />;

  const isPoster = connected && address === bounty.posterAddress;
  const isAgent = connected && address === bounty.agentAddress;

  const timelineItems: TimelineItem[] = [
    { label: "Bounty Posted", txHash: bounty.postTxHash, active: false },
    { label: "Bounty Claimed", txHash: bounty.claimTxHash, active: bounty.status === "open" },
    { label: "Work Submitted", txHash: bounty.submitTxHash, active: bounty.status === "claimed" },
    { label: "Completed & Paid", txHash: bounty.completeTxHash, active: bounty.status === "submitted" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/bounties" className="hover:text-slate-300">
          Bounties
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">#{params.id}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              >
                {bounty.category}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-purple-500/10 text-purple-400 border-purple-500/20 capitalize"
              >
                {bounty.difficulty}
              </Badge>
              <StatusBadge status={bounty.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">{bounty.title}</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              {bounty.description}
            </p>
          </div>

          {/* Verification Type */}
          <div className="glass rounded-xl p-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Verification
            </h3>
            <p className="text-sm text-slate-300">
              <span className="font-medium text-indigo-400">{bounty.verificationType}</span>
              {bounty.verificationType === "Optimistic" && bounty.disputeWindowMinutes && (
                <span className="text-muted-foreground">
                  {" "}&mdash; {bounty.disputeWindowMinutes} minute dispute window
                </span>
              )}
            </p>
          </div>

          {/* Tags */}
          {bounty.tags && bounty.tags.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {bounty.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-white/[0.1] text-slate-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Submitted Result */}
          {bounty.resultIpfs && (
            <div className="glass rounded-xl p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Submitted Result
              </h3>
              <a
                href={`https://w3s.link/ipfs/${bounty.resultIpfs}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline break-all"
              >
                ipfs://{bounty.resultIpfs}
              </a>
            </div>
          )}

          {/* Transaction History */}
          <TxTimeline items={timelineItems} />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Reward Card */}
          <div className="glass rounded-xl p-6 text-center">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Reward
            </p>
            <p className="text-3xl font-bold font-mono text-gradient-gold">
              {formatAda(bounty.rewardLovelace)}
            </p>
          </div>

          {/* Deadline */}
          <div className="glass rounded-xl p-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Deadline
            </p>
            <CountdownTimer deadline={bounty.deadline} />
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(bounty.deadline).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Poster */}
          <div className="glass rounded-xl p-6">
            <AddressDisplay address={bounty.posterAddress} label="Posted by" />
          </div>

          {/* Agent (if claimed) */}
          {bounty.agentAddress && (
            <div className="glass rounded-xl p-6">
              <AddressDisplay address={bounty.agentAddress} label="Claimed by" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {bounty.status === "open" && connected && !isPoster && (
              <Button className="btn-primary w-full py-3 text-base">
                Claim This Bounty
              </Button>
            )}

            {bounty.status === "open" && !connected && (
              <Button
                disabled
                className="w-full py-3 text-base opacity-50 bg-slate-700 text-slate-400 cursor-not-allowed"
              >
                Connect Wallet to Claim
              </Button>
            )}

            {bounty.status === "claimed" && isAgent && (
              <Button className="btn-primary w-full py-3 text-base">
                Submit Work
              </Button>
            )}

            {bounty.status === "submitted" && isPoster && (
              <>
                <Button className="btn-primary w-full py-3">
                  Approve &amp; Pay
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 py-3 text-red-400 hover:bg-red-500/10"
                >
                  Dispute
                </Button>
              </>
            )}

            {bounty.status === "open" && isPoster && (
              <Button
                variant="outline"
                className="w-full border-red-500/30 py-3 text-red-400 hover:bg-red-500/10"
              >
                Cancel Bounty
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
