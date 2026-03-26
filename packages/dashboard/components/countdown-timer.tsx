"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

export function CountdownTimer({ deadline }: { deadline: string }) {
  const { days, hours, minutes, seconds, isExpired, isUrgent } =
    useCountdown(deadline);

  if (isExpired) {
    return <span className="text-sm font-medium text-red-400">Expired</span>;
  }

  const hoursLeft = days * 24 + hours;

  return (
    <span
      className={cn(
        "font-mono text-sm",
        hoursLeft < 1
          ? "text-red-400"
          : hoursLeft < 24
          ? "text-yellow-400"
          : "text-slate-200"
      )}
    >
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </span>
  );
}
