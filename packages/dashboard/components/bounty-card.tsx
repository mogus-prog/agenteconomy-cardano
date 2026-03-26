import Link from "next/link";
import { cn, formatAda } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { Badge } from "@/components/ui/badge";
import type { Bounty } from "@/lib/types";

interface BountyCardProps {
  bounty: Bounty;
  className?: string;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function BountyCard({ bounty, className }: BountyCardProps) {
  return (
    <Link
      href={`/bounties/${bounty.id}`}
      className={cn(
        "glass group block rounded-xl p-5 transition-all hover:border-white/[0.15] hover:bg-white/[0.05]",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs"
        >
          {bounty.category}
        </Badge>
        <Badge
          variant="outline"
          className={cn("text-xs", difficultyColors[bounty.difficulty])}
        >
          {bounty.difficulty}
        </Badge>
        <StatusBadge status={bounty.status} />
        {bounty.isRecurring && (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs gap-1"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Recurring
          </Badge>
        )}
      </div>
      <h3 className="mb-2 line-clamp-2 text-base font-semibold text-slate-100 group-hover:text-white">
        {bounty.title}
      </h3>
      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
        {bounty.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-amber-400">
          {formatAda(bounty.rewardLovelace)}
        </span>
        <CountdownTimer deadline={bounty.deadline} />
      </div>
    </Link>
  );
}
