/**
 * ReputationRegistry event handler.
 * Processes reputation UTXO changes.
 */

import { decodeReputationDatum } from "./utils/decodeDatum.js";

export async function handleReputationUpdated(event: {
  txHash: string;
  outputIndex: number;
  plutusData: unknown;
}): Promise<void> {
  const datum = decodeReputationDatum(event.plutusData);

  // UPSERT agent row in agents table
  const agentRow = {
    address: datum.agentPkh,
    pub_key_hash: datum.agentPkh,
    total_completed: datum.totalCompleted,
    total_earned_lovelace: datum.totalEarnedLovelace.toString(),
    success_rate_bps: datum.successRateBps,
    rank_global: null, // Recalculated by nightly worker
  };

  // In production: db.insert(agents).values(agentRow).onConflictDoUpdate(...)
  console.log(`[indexer] reputation updated for ${datum.agentPkh}: completed=${datum.totalCompleted}`);
}
