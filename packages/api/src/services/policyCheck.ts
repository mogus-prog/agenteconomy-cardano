import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { wallets, spendingEvents } from "../db/schema.js";

export interface ComplianceResult {
  compliant: boolean;
  reason?: string;
}

export async function checkCompliance(
  walletAddress: string,
  amountLovelace: bigint,
  recipientAddress: string,
): Promise<ComplianceResult> {
  // Fetch wallet policy
  const walletRows = await db
    .select({
      perTxLimitLovelace: wallets.perTxLimitLovelace,
      dailyLimitLovelace: wallets.dailyLimitLovelace,
      whitelistedAddresses: wallets.whitelistedAddresses,
      isPaused: wallets.isPaused,
      pauseUntil: wallets.pauseUntil,
    })
    .from(wallets)
    .where(eq(wallets.address, walletAddress))
    .limit(1);

  const wallet = walletRows[0];
  if (!wallet) {
    return { compliant: false, reason: "Wallet not found" };
  }

  // Check if wallet is paused
  if (wallet.isPaused) {
    if (!wallet.pauseUntil || wallet.pauseUntil > new Date()) {
      return { compliant: false, reason: "Wallet is paused" };
    }
  }

  // Check per-tx limit
  if (wallet.perTxLimitLovelace !== null && amountLovelace > wallet.perTxLimitLovelace) {
    return {
      compliant: false,
      reason: `Amount ${amountLovelace.toString()} exceeds per-tx limit of ${wallet.perTxLimitLovelace.toString()}`,
    };
  }

  // Check recipient whitelist (if whitelist is non-empty, recipient must be in it)
  if (
    wallet.whitelistedAddresses &&
    wallet.whitelistedAddresses.length > 0 &&
    !wallet.whitelistedAddresses.includes(recipientAddress)
  ) {
    return {
      compliant: false,
      reason: "Recipient address not in whitelist",
    };
  }

  // Check rolling 24h daily limit
  if (wallet.dailyLimitLovelace !== null) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${spendingEvents.amountLovelace}), 0)::text`,
      })
      .from(spendingEvents)
      .where(
        and(
          eq(spendingEvents.walletAddress, walletAddress),
          gte(spendingEvents.spentAt, twentyFourHoursAgo),
        ),
      );

    const dailySpent = BigInt(result[0]?.total ?? "0");
    if (dailySpent + amountLovelace > wallet.dailyLimitLovelace) {
      return {
        compliant: false,
        reason: `Daily spending would reach ${(dailySpent + amountLovelace).toString()}, exceeding limit of ${wallet.dailyLimitLovelace.toString()}`,
      };
    }
  }

  return { compliant: true };
}
