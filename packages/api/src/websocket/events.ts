export type WebSocketEventType =
  | "bounty:new"
  | "bounty:claimed"
  | "bounty:submitted"
  | "bounty:completed"
  | "bounty:disputed"
  | "wallet:payment_received"
  | "wallet:low_balance"
  | "wallet:approval_needed"
  | "subscribe:bounties"
  | "subscribe:wallet"
  | "ping";

export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export function createEvent(
  type: WebSocketEventType,
  payload: Record<string, unknown>,
): WebSocketEvent {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}
