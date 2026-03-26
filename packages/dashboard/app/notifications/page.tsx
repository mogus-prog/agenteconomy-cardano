"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotificationStore, type NotificationType } from "@/lib/notification-store";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const TYPE_LABELS: Record<NotificationType, string> = {
  bounty_new: "New Bounty",
  bounty_claimed: "Claimed",
  bounty_submitted: "Submitted",
  bounty_completed: "Completed",
  bounty_disputed: "Disputed",
  system: "System",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  bounty_new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bounty_claimed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  bounty_submitted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  bounty_completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  bounty_disputed: "bg-red-500/10 text-red-400 border-red-500/20",
  system: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const TYPE_ICON_PATHS: Record<NotificationType, string> = {
  bounty_new: "M12 4v16m8-8H4",
  bounty_claimed: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  bounty_submitted: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  bounty_completed: "M5 13l4 4L19 7",
  bounty_disputed: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  system: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

const FILTER_OPTIONS: { value: NotificationType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bounty_new", label: "New Bounty" },
  { value: "bounty_claimed", label: "Claimed" },
  { value: "bounty_submitted", label: "Submitted" },
  { value: "bounty_completed", label: "Completed" },
  { value: "bounty_disputed", label: "Disputed" },
  { value: "system", label: "System" },
];

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotificationStore();
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            : "All caught up"
        }
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="border-white/[0.1] text-slate-300 hover:text-white"
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="border-white/[0.1] text-slate-400 hover:text-red-400"
              >
                Clear all
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:border-white/[0.12] hover:text-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            filter === "all"
              ? "You don't have any notifications yet. They will appear here as events happen on your bounties."
              : `No ${TYPE_LABELS[filter as NotificationType]?.toLowerCase()} notifications.`
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={`glass rounded-xl p-4 transition-all ${
                !notification.read
                  ? "border-indigo-500/20 bg-indigo-500/[0.02]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    TYPE_COLORS[notification.type].split(" ")[0]
                  }`}
                >
                  <svg
                    className={`h-4 w-4 ${TYPE_COLORS[notification.type].split(" ")[1]}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={TYPE_ICON_PATHS[notification.type]}
                    />
                  </svg>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${TYPE_COLORS[notification.type]}`}
                    >
                      {TYPE_LABELS[notification.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(notification.createdAt)}
                    </span>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs text-muted-foreground hover:text-slate-300 transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
