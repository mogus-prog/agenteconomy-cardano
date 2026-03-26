/**
 * RecurringBountyWorker — runs every 60 seconds.
 * Scans for completed recurring bounties and reposts them
 * with fresh status="open", incremented recurringCount,
 * and a new deadline based on the original duration.
 */

import { db } from "../db/index.js";
import { bounties } from "../db/schema.js";
import { eq, and, isNull, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export function startRecurringBountyWorker(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      // Find recurring bounties that are completed and eligible for repost
      const eligibleBounties = await db
        .select()
        .from(bounties)
        .where(
          and(
            eq(bounties.isRecurring, true),
            eq(bounties.status, "completed"),
            or(
              isNull(bounties.maxRecurrences),
              sql`${bounties.recurringCount} < ${bounties.maxRecurrences}`
            )
          )
        );

      for (const bounty of eligibleBounties) {
        // Calculate new deadline based on recurring interval
        const intervalMs = bounty.recurringIntervalMs
          ? Number(bounty.recurringIntervalMs)
          : 86400000; // default to 24h
        const newDeadline = new Date(Date.now() + intervalMs);
        const newId = randomUUID();
        const now = new Date();

        // Create a new bounty with same parameters but fresh status
        await db.insert(bounties).values({
          id: newId,
          utxoRef: `recurring-${newId}`,
          version: bounty.version,
          title: bounty.title,
          descriptionIpfs: bounty.descriptionIpfs,
          category: bounty.category,
          difficulty: bounty.difficulty,
          tags: bounty.tags,
          resultSchemaIpfs: bounty.resultSchemaIpfs,
          rewardLovelace: bounty.rewardLovelace,
          rewardTokenPolicy: bounty.rewardTokenPolicy,
          rewardTokenName: bounty.rewardTokenName,
          rewardTokenAmount: bounty.rewardTokenAmount,
          bondLovelace: bounty.bondLovelace,
          posterAddress: bounty.posterAddress,
          allowedAgents: bounty.allowedAgents,
          deadline: newDeadline,
          claimWindowMs: bounty.claimWindowMs,
          disputeWindowMs: bounty.disputeWindowMs,
          createdAt: now,
          updatedAt: now,
          verificationType: bounty.verificationType,
          oraclePubKey: bounty.oraclePubKey,
          status: "open",
          postTxHash: `recurring-${newId}`,
          // Recurring fields
          isRecurring: true,
          recurringIntervalMs: bounty.recurringIntervalMs,
          recurringCount: (bounty.recurringCount ?? 0) + 1,
          maxRecurrences: bounty.maxRecurrences,
          parentBountyId: bounty.parentBountyId ?? bounty.id,
        });

        // Mark the original bounty as no longer needing repost
        // by setting isRecurring to false (it has been reposted)
        await db
          .update(bounties)
          .set({ isRecurring: false, updatedAt: now })
          .where(eq(bounties.id, bounty.id));

        console.log(
          `[worker] recurringBountyWorker: reposted bounty "${bounty.title}" ` +
          `(count: ${(bounty.recurringCount ?? 0) + 1}, parent: ${bounty.parentBountyId ?? bounty.id})`
        );
      }

      if (eligibleBounties.length > 0) {
        console.log(
          `[worker] recurringBountyWorker: reposted ${eligibleBounties.length} bounties`
        );
      }
    } catch (error) {
      console.error("[worker] recurringBountyWorker error:", error);
    }
  }, 60 * 1000);
}
