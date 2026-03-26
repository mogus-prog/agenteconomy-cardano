import { cn } from "@/lib/utils";
import type { BountyStatus } from "@/lib/types";

const statusStyles: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  claimed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/10 text-green-400 border-green-500/30",
  disputed: "bg-red-500/10 text-red-400 border-red-500/30",
  refunded: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export function StatusBadge({ status }: { status: BountyStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? statusStyles.open
      )}
    >
      {status}
    </span>
  );
}
