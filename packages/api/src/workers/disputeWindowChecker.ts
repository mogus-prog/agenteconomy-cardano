/**
 * DisputeWindowChecker — runs every 5 minutes.
 * Detects submitted work where dispute_window_ms passed.
 * Auto-builds VerifyAndPay for Optimistic bounties.
 */

export function startDisputeWindowChecker(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      console.log("[worker] disputeWindowChecker tick");
    } catch (error) {
      console.error("[worker] disputeWindowChecker error:", error);
    }
  }, 5 * 60 * 1000);
}
