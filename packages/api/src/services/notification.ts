import { redis } from "../lib/redis.js";

export interface NotificationPayload {
  type: string;
  recipient: string;
  data: Record<string, unknown>;
}

export async function pushNotification(payload: NotificationPayload): Promise<void> {
  // Push to Redis queue for async processing by NotificationWorker
  console.log(`[notification] ${payload.type} → ${payload.recipient}`);
  await redis.lpush("queue:notifications", JSON.stringify(payload));
}
