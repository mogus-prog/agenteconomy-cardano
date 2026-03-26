import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  return (
    <div className={cn("glass rounded-xl p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trendLabel && (
            <p
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-emerald-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" && "+ "}
              {trend === "down" && "- "}
              {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
            <Icon className="h-5 w-5 text-indigo-400" />
          </div>
        )}
      </div>
    </div>
  );
}
