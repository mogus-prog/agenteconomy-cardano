"use client";

import { useState } from "react";
import { useDisputes, useBounty } from "@/lib/queries";
import { formatAda } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AddressDisplay } from "@/components/address-display";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Dispute, DisputeStatus } from "@/lib/types";

const STATUS_STYLES: Record<DisputeStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: "Pending",
  in_progress: "Under Review",
  resolved: "Resolved",
};

export default function DisputeCenterPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading } = useDisputes(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const disputes = data?.data ?? [];

  const pendingCount = disputes.filter((d) => d.status === "pending").length;
  const inProgressCount = disputes.filter((d) => d.status === "in_progress").length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispute Center"
        description="Active and resolved disputes on the network"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Open" value={pendingCount} />
            <StatCard label="Under Review" value={inProgressCount} />
            <StatCard label="Resolved" value={resolvedCount} />
          </>
        )}
      </div>

      {/* Filter */}
      <div className="glass rounded-xl p-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 border-white/[0.08] bg-white/[0.03]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="border-white/[0.08] bg-navy-950">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dispute Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState title="No disputes" description="There are no disputes matching your filter." />
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <DisputeCard key={dispute.id} dispute={dispute} />
          ))}
        </div>
      )}
    </div>
  );
}

function DisputeCard({ dispute }: { dispute: Dispute }) {
  const { data: bounty } = useBounty(dispute.bountyId);

  return (
    <div className="glass rounded-xl p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={STATUS_STYLES[dispute.status]}
            >
              {STATUS_LABELS[dispute.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              #{dispute.id}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">
            <a
              href={`/bounties/${dispute.bountyId}`}
              className="hover:text-indigo-400 transition-colors"
            >
              {bounty?.title ?? `Bounty #${dispute.bountyId}`}
            </a>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <AddressDisplay address={dispute.filedBy} label="Filed by" />
            <span>vs</span>
            <AddressDisplay address={dispute.agentAddress} label="Agent" />
          </div>
        </div>
        <div className="text-right">
          {bounty && (
            <>
              <p className="text-xl font-bold font-mono text-amber-400">
                {formatAda(bounty.rewardLovelace)}
              </p>
              <p className="text-xs text-muted-foreground">in escrow</p>
            </>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="mb-5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-slate-300">
        <span className="mr-2 text-muted-foreground">Reason:</span>
        {dispute.reason}
      </div>

      {/* Timeline */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
          Timeline
        </h4>
        <ol className="relative border-l border-white/[0.08]">
          {/* Filed event */}
          <li className="mb-4 ml-4">
            <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-white/[0.1] bg-white/[0.15]" />
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <span className="font-medium text-indigo-400">Filed</span>
              <span className="text-slate-300">Dispute opened</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(dispute.filedAt).toLocaleDateString()}
              </span>
            </div>
          </li>

          {/* In progress */}
          {(dispute.status === "in_progress" || dispute.status === "resolved") && (
            <li className="mb-4 ml-4">
              <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-blue-500/30 bg-blue-500/20" />
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium text-blue-400">Under Review</span>
                <span className="text-slate-300">Dispute under review</span>
              </div>
            </li>
          )}

          {/* Resolved */}
          {dispute.status === "resolved" && dispute.resolvedAt && (
            <li className="ml-4">
              <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-emerald-500/30 bg-emerald-500/20" />
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium text-emerald-400">Resolved</span>
                <span className="text-slate-300">
                  {dispute.resolution ?? "Dispute resolved"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(dispute.resolvedAt).toLocaleDateString()}
                </span>
              </div>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
