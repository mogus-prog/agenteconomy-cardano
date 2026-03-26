"use client";

import { useState, useEffect } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { useWalletStore } from "@/lib/store";
import { useBountyStats } from "@/lib/queries";
import { config } from "@/lib/config";
import { formatAda } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthStatus {
  api: "healthy" | "degraded" | "down" | "loading";
  db: "healthy" | "degraded" | "down" | "loading";
  redis: "healthy" | "degraded" | "down" | "loading";
}

const HEALTH_STYLES = {
  healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  degraded: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  down: "bg-red-500/10 text-red-400 border-red-500/30",
  loading: "bg-white/[0.04] text-muted-foreground border-white/[0.08]",
};

const ORACLES = [
  {
    name: "Primary Oracle — Mainnet",
    address: "addr1qz...oracle01",
    status: "healthy" as const,
    lastPing: "12s ago",
    verifications: 4821,
    successRate: "99.6%",
  },
  {
    name: "Backup Oracle — Mainnet",
    address: "addr1qz...oracle02",
    status: "healthy" as const,
    lastPing: "14s ago",
    verifications: 284,
    successRate: "99.1%",
  },
  {
    name: "Standby Oracle",
    address: "addr1qz...oracle99",
    status: "degraded" as const,
    lastPing: "4m ago",
    verifications: 82,
    successRate: "91.2%",
  },
];

const ACTIVITY_LOG = [
  { time: "2026-03-25 11:42", actor: "Admin", action: "Set max bounty reward to 10,000 ADA", type: "config" },
  { time: "2026-03-25 10:15", actor: "System", action: "Oracle failover triggered: primary latency spike", type: "alert" },
  { time: "2026-03-24 16:00", actor: "Admin", action: "Banned agent addr1...bad for fraudulent submission", type: "action" },
  { time: "2026-03-24 09:30", actor: "Admin", action: "Protocol fee updated from 1.5% to 2.0%", type: "config" },
  { time: "2026-03-23 22:10", actor: "System", action: "Dispute #d-003 auto-escalated after 48h timeout", type: "alert" },
];

const ACTIVITY_STYLES: Record<string, string> = {
  config: "text-blue-400",
  alert: "text-yellow-400",
  action: "text-red-400",
};

export default function AdminPage() {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { connected, address } = useWalletStore();
  const { data: stats, isLoading: loadingStats } = useBountyStats();
  const [health, setHealth] = useState<HealthStatus>({
    api: "loading",
    db: "loading",
    redis: "loading",
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${config.apiUrl}/health`);
        if (res.ok) {
          setHealth((h) => ({ ...h, api: "healthy" }));
        } else {
          setHealth((h) => ({ ...h, api: "degraded" }));
        }
      } catch {
        setHealth((h) => ({ ...h, api: "down" }));
      }

      try {
        const res = await fetch(`${config.apiUrl}/ready`);
        if (res.ok) {
          const data = await res.json();
          setHealth((h) => ({
            ...h,
            db: data.db ? "healthy" : "down",
            redis: data.redis ? "healthy" : "down",
          }));
        } else {
          setHealth((h) => ({ ...h, db: "degraded", redis: "degraded" }));
        }
      } catch {
        setHealth((h) => ({ ...h, db: "down", redis: "down" }));
      }
    }

    checkHealth();
  }, []);

  // Require Clerk authentication first
  if (clerkLoaded && !isSignedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Sign In Required</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in with your account to access the admin panel.
          </p>
          <SignInButton mode="modal">
            <Button className="btn-primary px-6 py-2.5">Sign In</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Then require wallet connection
  if (!connected || !address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Connect Wallet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect wallet to access admin panel.
          </p>
          <Button className="btn-primary px-6 py-2.5">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="Oracle management, protocol stats, and system health">
        <Badge className="bg-teal/10 text-teal border-teal/30">
          {config.network}
        </Badge>
      </PageHeader>

      {/* Protocol Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loadingStats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : stats ? (
          <>
            <StatCard label="Total Bounties" value={stats.total} />
            <StatCard label="Open" value={stats.open} />
            <StatCard label="In Progress" value={stats.inProgress} />
            <StatCard label="Completed" value={stats.completed} />
            <StatCard label="Disputed" value={stats.disputed} />
            <StatCard label="ADA Locked" value={formatAda(stats.totalRewardLovelace)} />
          </>
        ) : (
          <EmptyState title="Stats unavailable" className="col-span-full" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Oracle Management */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">Oracle Management</h2>
          {ORACLES.map((oracle) => (
            <div key={oracle.name} className="glass rounded-xl p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={HEALTH_STYLES[oracle.status]}
                    >
                      {oracle.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {oracle.lastPing}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white">{oracle.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {oracle.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-white/[0.08] text-xs">
                    Ping
                  </Button>
                  <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400 text-xs">
                    Pause
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3 text-center">
                <div>
                  <p className="text-sm font-bold text-white">
                    {oracle.verifications.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Verifications</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {oracle.successRate}
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Health + Activity Log */}
        <div className="space-y-6">
          {/* System Health */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">System Health</h2>
            <div className="glass rounded-xl p-4 space-y-3">
              {[
                { label: "API Server", status: health.api },
                { label: "Database (PostgreSQL)", status: health.db },
                { label: "Cache (Redis)", status: health.redis },
              ].map((service) => (
                <div
                  key={service.label}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                >
                  <span className="text-sm text-slate-300">{service.label}</span>
                  <Badge
                    variant="outline"
                    className={HEALTH_STYLES[service.status]}
                  >
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">Activity Log</h2>
            <div className="glass rounded-xl p-4 space-y-2">
              {ACTIVITY_LOG.map((entry, i) => (
                <div key={i} className="rounded-lg bg-white/[0.02] p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-xs font-medium ${ACTIVITY_STYLES[entry.type] ?? "text-muted-foreground"}`}
                    >
                      {entry.actor}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {entry.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
