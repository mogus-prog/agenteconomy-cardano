"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBounty } from "@/lib/queries";
import { useWalletStore } from "@/lib/store";
import { formatAda, cardanoscanUrl, truncateAddress } from "@/lib/utils";
import { assembleSignedTx, enableWallet } from "@/lib/tx-utils";
import {
  buildClaimBounty,
  buildSubmitWork,
  buildApprovePay,
  buildDispute,
} from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { AddressDisplay } from "@/components/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = "https://api-production-02a1.up.railway.app";

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

/**
 * Records/updates bounty status in the DB after a successful on-chain tx.
 * Fire-and-forget: indexer will pick it up eventually if this fails.
 */
async function recordBountyAction(
  bountyId: string,
  action: string,
  txHash: string,
  extra?: Record<string, unknown>
) {
  try {
    await fetch(`${API_BASE}/v1/bounties/${bountyId}/record-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, txHash, ...extra }),
    });
  } catch {
    // Non-critical -- indexer picks it up from chain
  }
}

type ActionType = "claim" | "submitWork" | "approve" | "dispute";

export default function BountyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: bounty, isLoading, error } = useBounty(params.id);
  const { connected, address } = useWalletStore();

  const [processing, setProcessing] = useState<ActionType | null>(null);
  const [showSubmitWorkModal, setShowSubmitWorkModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [submitWorkResult, setSubmitWorkResult] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const isProcessing = processing !== null;

  const refreshBounty = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["bounty", params.id] });
    queryClient.invalidateQueries({ queryKey: ["bounties"] });
    queryClient.invalidateQueries({ queryKey: ["bountyStats"] });
  }, [queryClient, params.id]);

  /**
   * Generic transaction flow: build -> sign -> assemble -> submit -> record
   */
  const executeTxFlow = useCallback(
    async (
      actionType: ActionType,
      buildFn: () => Promise<{ unsignedTxCbor: string }>,
      onSuccess: (txHash: string) => void | Promise<void>,
      recordAction?: string,
      recordExtra?: Record<string, unknown>
    ) => {
      if (!connected || !address) {
        toast.error("Wallet not connected");
        return;
      }
      const { walletName } = useWalletStore.getState();
      if (!walletName) {
        toast.error("No wallet connected");
        return;
      }

      setProcessing(actionType);
      try {
        // Step 1: Build unsigned transaction via API
        toast.info("Building transaction...");
        const buildResult = await buildFn();
        if (!buildResult.unsignedTxCbor) {
          throw new Error("No unsigned transaction returned from API");
        }

        // Step 2: Sign with CIP-30 wallet
        toast.info("Please sign the transaction in your wallet...");
        const wallet = await enableWallet(walletName);
        const witnessSet = await wallet.signTx(buildResult.unsignedTxCbor);

        // Step 3: Assemble signed tx and submit
        toast.info("Submitting transaction to the blockchain...");
        const assembledTx = assembleSignedTx(buildResult.unsignedTxCbor, witnessSet);
        const txHash = await wallet.submitTx(assembledTx);

        // Step 4: Record in DB (fire-and-forget)
        if (recordAction) {
          await recordBountyAction(params.id, recordAction, txHash, recordExtra);
        }

        // Step 5: Success
        toast.success("Transaction submitted!", {
          description: `TX: ${txHash.slice(0, 16)}...`,
        });

        await onSuccess(txHash);
        refreshBounty();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("User declined") || msg.includes("cancelled")) {
          toast.error("Transaction cancelled by user");
        } else {
          toast.error("Transaction failed", { description: msg });
        }
      } finally {
        setProcessing(null);
      }
    },
    [connected, address, params.id, refreshBounty]
  );

  // ── Claim Bounty ──
  const handleClaim = useCallback(() => {
    if (!address) return;
    executeTxFlow(
      "claim",
      () => buildClaimBounty(params.id, { agent: address }),
      async () => {
        // Optionally redirect or just refresh
      },
      "claim",
      { agentAddress: address }
    );
  }, [address, params.id, executeTxFlow]);

  // ── Submit Work ──
  const handleSubmitWork = useCallback(() => {
    if (!address || !submitWorkResult.trim()) {
      toast.error("Please enter your work result");
      return;
    }
    setShowSubmitWorkModal(false);
    executeTxFlow(
      "submitWork",
      () =>
        buildSubmitWork(params.id, {
          agent: address,
          resultIpfs: submitWorkResult.trim(),
        }),
      async () => {
        setSubmitWorkResult("");
      },
      "submit-work",
      { agentAddress: address, resultIpfs: submitWorkResult.trim() }
    );
  }, [address, params.id, submitWorkResult, executeTxFlow]);

  // ── Approve & Pay ──
  const handleApprovePay = useCallback(() => {
    if (!address) return;
    executeTxFlow(
      "approve",
      () => buildApprovePay(params.id, { poster: address }),
      async () => {
        // Bounty completed
      },
      "approve",
      { posterAddress: address }
    );
  }, [address, params.id, executeTxFlow]);

  // ── Dispute ──
  const handleDispute = useCallback(() => {
    if (!address || !disputeReason.trim()) {
      toast.error("Please enter a reason for the dispute");
      return;
    }
    setShowDisputeModal(false);
    executeTxFlow(
      "dispute",
      () =>
        buildDispute(params.id, {
          poster: address,
          reason: disputeReason.trim(),
        }),
      async () => {
        setDisputeReason("");
      },
      "dispute",
      { posterAddress: address, reason: disputeReason.trim() }
    );
  }, [address, params.id, disputeReason, executeTxFlow]);

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
            {/* Claim Bounty */}
            {bounty.status === "open" && connected && !isPoster && (
              <Button
                className="btn-primary w-full py-3 text-base"
                disabled={isProcessing}
                onClick={handleClaim}
              >
                {processing === "claim" ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Claiming...
                  </span>
                ) : (
                  "Claim This Bounty"
                )}
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

            {/* Submit Work */}
            {bounty.status === "claimed" && isAgent && (
              <Button
                className="btn-primary w-full py-3 text-base"
                disabled={isProcessing}
                onClick={() => setShowSubmitWorkModal(true)}
              >
                {processing === "submitWork" ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Submitting...
                  </span>
                ) : (
                  "Submit Work"
                )}
              </Button>
            )}

            {/* Approve & Pay */}
            {bounty.status === "submitted" && isPoster && (
              <>
                <Button
                  className="btn-primary w-full py-3"
                  disabled={isProcessing}
                  onClick={handleApprovePay}
                >
                  {processing === "approve" ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Approving...
                    </span>
                  ) : (
                    "Approve & Pay"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 py-3 text-red-400 hover:bg-red-500/10"
                  disabled={isProcessing}
                  onClick={() => setShowDisputeModal(true)}
                >
                  {processing === "dispute" ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Filing Dispute...
                    </span>
                  ) : (
                    "Dispute"
                  )}
                </Button>
              </>
            )}

            {bounty.status === "open" && isPoster && (
              <Button
                variant="outline"
                className="w-full border-red-500/30 py-3 text-red-400 hover:bg-red-500/10"
                disabled={isProcessing}
              >
                Cancel Bounty
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Work Modal */}
      <Dialog open={showSubmitWorkModal} onOpenChange={setShowSubmitWorkModal}>
        <DialogContent className="border-white/[0.1] bg-[#0a1628] text-slate-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Submit Work Result</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter your work result below. This can be an IPFS CID, a JSON payload,
              or a text description of the completed work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              rows={6}
              placeholder="Enter IPFS CID (e.g. bafybeig...) or paste your result as JSON/text..."
              value={submitWorkResult}
              onChange={(e) => setSubmitWorkResult(e.target.value)}
              className="border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-500"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/[0.1] text-slate-300"
                onClick={() => setShowSubmitWorkModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="btn-primary"
                disabled={!submitWorkResult.trim() || isProcessing}
                onClick={handleSubmitWork}
              >
                {processing === "submitWork" ? "Submitting..." : "Submit & Sign TX"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="border-white/[0.1] bg-[#0a1628] text-slate-200 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">File a Dispute</DialogTitle>
            <DialogDescription className="text-slate-400">
              Explain why the submitted work does not meet the bounty requirements.
              This will be recorded on-chain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              rows={4}
              placeholder="Describe the reason for disputing this submission..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-500"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/[0.1] text-slate-300"
                onClick={() => setShowDisputeModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!disputeReason.trim() || isProcessing}
                onClick={handleDispute}
              >
                {processing === "dispute" ? "Filing..." : "File Dispute & Sign TX"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Small inline spinner for button loading states */
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
