"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useBounties } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { BountyCard } from "@/components/bounty-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { BountyCategory, BountyStatus, BountyFilters } from "@/lib/types";

const CATEGORIES: Array<BountyCategory | "All"> = [
  "All",
  "DataExtraction",
  "CodeGen",
  "Research",
  "Content",
  "OnChain",
  "Translation",
  "Moderation",
];

const STATUSES: Array<BountyStatus | "All"> = [
  "All",
  "open",
  "claimed",
  "submitted",
  "completed",
  "disputed",
];

const SORT_OPTIONS = [
  { label: "Newest", orderBy: "createdAt" as const, order: "desc" as const },
  { label: "Highest Reward", orderBy: "rewardLovelace" as const, order: "desc" as const },
  { label: "Soonest Deadline", orderBy: "deadline" as const, order: "asc" as const },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function BountiesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<BountyCategory | "All">("All");
  const [status, setStatus] = useState<BountyStatus | "All">("All");
  const [sortIndex, setSortIndex] = useState(0);
  const [limit, setLimit] = useState(12);

  const debouncedSearch = useDebounce(searchInput, 300);

  const filters: BountyFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category !== "All" ? category : undefined,
      status: status !== "All" ? status : undefined,
      orderBy: SORT_OPTIONS[sortIndex].orderBy,
      order: SORT_OPTIONS[sortIndex].order,
      limit,
      offset: 0,
    }),
    [debouncedSearch, category, status, sortIndex, limit]
  );

  const { data, isLoading } = useBounties(filters);

  const hasMore = data ? data.pagination.total > data.data.length : false;

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setCategory("All");
    setStatus("All");
    setSortIndex(0);
    setLimit(12);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Bounty Board" description="Find and claim tasks posted by the community">
        <Link href="/bounties/new" className="btn-primary px-5 py-2.5 text-sm">
          Post Bounty
        </Link>
      </PageHeader>

      {/* Filters Bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Search bounties..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as BountyCategory | "All")}>
            <SelectTrigger className="w-[160px] border-white/[0.08] bg-white/[0.03] text-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as BountyStatus | "All")}>
            <SelectTrigger className="w-[140px] border-white/[0.08] bg-white/[0.03] text-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(sortIndex)} onValueChange={(v) => setSortIndex(Number(v))}>
            <SelectTrigger className="w-[160px] border-white/[0.08] bg-white/[0.03] text-slate-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
              {SORT_OPTIONS.map((opt, i) => (
                <SelectItem key={i} value={String(i)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-5 space-y-3">
              <Skeleton className="h-5 w-24 bg-white/[0.06]" />
              <Skeleton className="h-5 w-full bg-white/[0.06]" />
              <Skeleton className="h-4 w-3/4 bg-white/[0.04]" />
              <Skeleton className="h-4 w-2/3 bg-white/[0.04]" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-6 w-20 bg-white/[0.06]" />
                <Skeleton className="h-5 w-16 bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState
          title="No bounties found"
          description="Try adjusting your filters or search terms."
          action={
            <Button onClick={resetFilters} variant="outline" className="border-white/[0.1] text-slate-200">
              Reset Filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.data.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setLimit((l) => l + 12)}
                variant="outline"
                className="border-white/[0.1] bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
