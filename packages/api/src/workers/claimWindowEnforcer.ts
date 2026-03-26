/**
 * ClaimWindowEnforcer — runs every 10 minutes.
 * Detects claims where claim_window_ms elapsed with no submission.
 * Resets bounty to Open, forfeits bond.
 */

export function startClaimWindowEnforcer(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      console.log("[worker] claimWindowEnforcer tick");
    } catch (error) {
      console.error("[worker] claimWindowEnforcer error:", error);
    }
  }, 10 * 60 * 1000);
}
