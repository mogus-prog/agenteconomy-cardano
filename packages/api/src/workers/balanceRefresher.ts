/**
 * BalanceRefresher — runs every 30 seconds.
 * Polls Blockfrost for balance updates for active wallets.
 */

export function startBalanceRefresher(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // In production: query wallets with recent activity,
      // fetch balances from Blockfrost, update cache
    } catch (error) {
      console.error("[worker] balanceRefresher error:", error);
    }
  }, 30 * 1000);
}
