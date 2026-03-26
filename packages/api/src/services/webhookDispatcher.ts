import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { webhooks } from "../db/schema.js";

/**
 * Dispatch a webhook event to all active webhooks subscribed to the given event type.
 * Uses Promise.allSettled so one failing webhook doesn't block others.
 */
export async function dispatchWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Find all active webhooks that include this eventType
  const allActive = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.isActive, true));

  // Filter to those subscribed to this event (array contains check in JS)
  const matching = allActive.filter(
    (wh) => wh.events && wh.events.includes(eventType),
  );

  if (matching.length === 0) return;

  const body = JSON.stringify({ event: eventType, payload, timestamp: new Date().toISOString() });

  const results = await Promise.allSettled(
    matching.map(async (wh) => {
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(body)
        .digest("hex");

      const response = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AgentEconomy-Signature": signature,
          "X-AgentEconomy-Event": eventType,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Webhook ${wh.id} returned ${response.status}`);
      }

      // Success — update lastTriggeredAt and reset failure count
      await db
        .update(webhooks)
        .set({ lastTriggeredAt: new Date(), failureCount: 0 })
        .where(eq(webhooks.id, wh.id));
    }),
  );

  // Handle failures: increment failureCount, auto-disable if > 10
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result && result.status === "rejected") {
      const wh = matching[i];
      if (!wh) continue;
      const newFailureCount = (wh.failureCount ?? 0) + 1;
      const updates: Record<string, unknown> = { failureCount: newFailureCount };
      if (newFailureCount > 10) {
        updates.isActive = false;
      }
      await db.update(webhooks).set(updates).where(eq(webhooks.id, wh.id));
    }
  }
}
