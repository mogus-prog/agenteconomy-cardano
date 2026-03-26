/**
 * Push events to Redis pub/sub for WebSocket fanout.
 */

export async function publishEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // In production: PUBLISH to Redis channel
  console.log(`[indexer] event: ${type}`, JSON.stringify(payload).slice(0, 100));
}
