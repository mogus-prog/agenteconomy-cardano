/**
 * NotificationWorker — continuous Redis queue consumer.
 * Consumes queue:notifications, delivers via webhook/email/WS.
 * Retries failures up to 3x.
 */

import { redis } from "../lib/redis.js";
import type { NotificationPayload } from "../services/notification.js";

async function processNotification(payload: NotificationPayload): Promise<void> {
  // TODO: deliver via webhook/email/WS based on payload.type
  // TODO: mark as delivered in DB
  console.log(`[worker] Delivering ${payload.type} → ${payload.recipient}`);
}

export function startNotificationWorker(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // BRPOP with 1 second timeout — blocks until an item is available or timeout
      const result = await redis.brpop("queue:notifications", 1);
      if (!result) return; // timeout, no items

      const [, raw] = result;
      const payload = JSON.parse(raw) as NotificationPayload;

      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          await processNotification(payload);
          break;
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            console.error(
              `[worker] Failed to deliver notification after ${maxRetries} retries:`,
              err,
            );
          }
        }
      }
    } catch (error) {
      console.error("[worker] notificationWorker error:", error);
    }
  }, 1000);
}
