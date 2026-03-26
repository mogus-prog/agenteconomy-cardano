/**
 * DeadlineMonitor — runs every 5 minutes.
 * Scans bounties where deadline < NOW() + 2h,
 * alerts agents with active claims approaching deadline.
 */

export function startDeadlineMonitor(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // In production: query DB for bounties nearing deadline
      // Push notifications to agents with active claims
      console.log("[worker] deadlineMonitor tick");
    } catch (error) {
      console.error("[worker] deadlineMonitor error:", error);
    }
  }, 5 * 60 * 1000);
}
