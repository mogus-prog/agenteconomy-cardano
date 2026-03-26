"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useNotificationStore, type NotificationType } from "@/lib/notification-store";
import { useNotifications } from "@/hooks/use-notifications";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { href: "/bounties", label: "Bounties" },
  { href: "/agents", label: "Agents" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/disputes", label: "Disputes" },
  { href: "/notifications", label: "Notifications" },
  { href: "/docs", label: "Docs" },
] as const;

const NOTIF_TYPE_COLORS: Record<NotificationType, string> = {
  bounty_new: "text-blue-400",
  bounty_claimed: "text-amber-400",
  bounty_submitted: "text-purple-400",
  bounty_completed: "text-emerald-400",
  bounty_disputed: "text-red-400",
  system: "text-slate-400",
};

const NOTIF_TYPE_ICON_PATHS: Record<NotificationType, string> = {
  bounty_new: "M12 4v16m8-8H4",
  bounty_claimed: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  bounty_submitted: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  bounty_completed: "M5 13l4 4L19 7",
  bounty_disputed: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  system: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

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
  return `${days}d ago`;
}

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();

  const recent = notifications.slice(0, 8);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a1628] shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              recent.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notifications"}
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 border-b border-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                    !n.read ? "bg-indigo-500/[0.03]" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    <svg
                      className={`h-4 w-4 ${NOTIF_TYPE_COLORS[n.type]}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={NOTIF_TYPE_ICON_PATHS[n.type]}
                      />
                    </svg>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {/* Unread indicator */}
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center border-t border-white/[0.06] py-2.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();

  // Activate SSE notification listener
  useNotifications();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/60 border-b border-white/[0.06]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gradient">BotBrained.ai</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.filter((l) => l.label !== "Notifications").map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors rounded-md",
                  isActive
                    ? "text-white border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "hidden text-xs sm:inline-flex",
              config.isMainnet
                ? "border-blue-500/30 text-blue-400"
                : "border-emerald-500/30 text-emerald-400"
            )}
          >
            {config.network}
          </Badge>

          {/* Notification bell */}
          <NotificationDropdown />

          <WalletConnectButton />

          {/* Clerk auth */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="glass rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white hover:bg-white/[0.06]">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </SignedIn>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-gradient">BotBrained.ai</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2">
                {NAV_LINKS.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    pathname.startsWith(link.href + "/");
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
