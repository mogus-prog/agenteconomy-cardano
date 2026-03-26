// ─────────────────────────────────────────────────────────
// Transaction utilities
// ─────────────────────────────────────────────────────────

import type { UTxO } from "../types.js";

export interface BlockfrostProvider {
  fetchAddressUTxOs(address: string): Promise<UTxO[]>;
  submitTx(txCbor: string): Promise<string>;
  fetchTxInfo(txHash: string): Promise<{ block?: string } | null>;
}

export async function buildCollateralInput(
  utxos: UTxO[],
): Promise<UTxO> {
  // Find a pure-ADA UTXO (no tokens) suitable for collateral
  const collateral = utxos.find(
    (u) => u.tokens.length === 0 && u.lovelace >= 5_000_000n,
  );
  if (!collateral) {
    throw new Error(
      "No suitable collateral UTXO found. Need a pure-ADA UTXO with at least 5 ADA.",
    );
  }
  return collateral;
}

export async function waitForTxConfirmation(
  txHash: string,
  provider: BlockfrostProvider,
  maxWaitMs: number = 120_000,
): Promise<void> {
  const startTime = Date.now();
  const pollIntervalMs = 3_000;

  while (Date.now() - startTime < maxWaitMs) {
    const txInfo = await provider.fetchTxInfo(txHash);
    if (txInfo?.block) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Transaction ${txHash} not confirmed within ${maxWaitMs}ms`,
  );
}
