"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWalletStore } from "@/lib/store";
import { useNotificationStore, type NotificationType } from "@/lib/notification-store";
import { config } from "@/lib/config";

/** Maps SSE event type strings to our notification types */
function mapEventType(eventType: string): NotificationType {
  switch (eventType) {
    case "bounty.created":
      return "bounty_new";
    case "bounty.claimed":
      return "bounty_claimed";
    case "bounty.submitted":
      return "bounty_submitted";
    case "bounty.completed":
      return "bounty_completed";
    case "bounty.disputed":
      return "bounty_disputed";
    default:
      return "system";
  }
}

/** Important event types that should trigger a toast */
const TOAST_EVENTS = new Set<NotificationType>([
  "bounty_claimed",
  "bounty_submitted",
  "bounty_completed",
  "bounty_disputed",
]);

/**
 * Connects to the SSE bounty feed when a wallet is connected.
 * Adds incoming events to the notification store and shows
 * toast alerts for important events.
 */
export function useNotifications() {
  const { connected, address } = useWalletStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!connected || !address) {
      // Close any existing connection when wallet disconnects
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const url = `${config.apiUrl}/v1/bounties/feed?address=${address}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = mapEventType(data.type ?? data.event ?? "system");
          const title =
            data.title ?? data.bountyTitle ?? "Notification";
          const message =
            data.message ?? data.description ?? "";
          const bountyId = data.bountyId ?? data.id;
          const link = bountyId ? `/bounties/${bountyId}` : undefined;

          addNotification({ type, title, message, link });

          if (TOAST_EVENTS.has(type)) {
            toast.info(title, { description: message });
          }
        } catch {
          // Ignore malformed events (e.g. heartbeats)
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!cancelled) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
          retryRef.current += 1;
          setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connected, address, addNotification]);
}
