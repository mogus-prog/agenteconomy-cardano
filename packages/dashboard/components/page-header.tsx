import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** @deprecated Use subtitle instead */
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  children,
  className,
}: PageHeaderProps) {
  const sub = subtitle ?? description;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-3xl font-bold text-gradient">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {(action || children) && (
        <div className="flex items-center gap-3">{action ?? children}</div>
      )}
    </div>
  );
}
