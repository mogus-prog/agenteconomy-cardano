/**
 * BountyRegistry event handlers.
 * Processes on-chain UTXO creation and spending events.
 * All DB operations use UPSERT for idempotent re-processing.
 */

import { decodeBountyDatum } from "./utils/decodeDatum.js";
import { decodeRedeemer } from "./utils/decodeRedeemer.js";
import { publishEvent } from "./utils/notifications.js";

const CATEGORY_NAMES = [
  "DataExtraction", "CodeGen", "Research", "Content",
  "OnChain", "Translation", "Moderation",
];

const DIFFICULTY_NAMES = ["Easy", "Medium", "Hard", "Expert"];

export async function handleUtxoCreated(event: {
  txHash: string;
  outputIndex: number;
  plutusData: unknown;
}): Promise<void> {
  const datum = decodeBountyDatum(event.plutusData);
  const utxoRef = `${event.txHash}#${event.outputIndex}`;

  // UPSERT bounty into database
  const bountyRow = {
    id: datum.bountyId,
    utxo_ref: utxoRef,
    status: "open",
    title: datum.title,
    description_ipfs: datum.descriptionIpfs,
    category: CATEGORY_NAMES[datum.category] ?? "Unknown",
    difficulty: DIFFICULTY_NAMES[datum.difficulty] ?? "Unknown",
    reward_lovelace: datum.rewardLovelace.toString(),
    poster_address: datum.poster,
    created_at: new Date(datum.createdAt).toISOString(),
    post_tx_hash: event.txHash,
  };

  // In production: db.insert(bounties).values(bountyRow).onConflictDoUpdate(...)
  console.log("[indexer] bounty created:", bountyRow.id);

  await publishEvent("bounty:new", {
    bounty_id: datum.bountyId,
    reward_ada: Number(datum.rewardLovelace) / 1_000_000,
    category: bountyRow.category,
  });
}

export async function handleUtxoSpent(event: {
  txHash: string;
  redeemer: unknown;
  inputUtxoRef: string;
  plutusData: unknown;
}): Promise<void> {
  const redeemer = decodeRedeemer(event.redeemer);

  switch (redeemer.constructorIndex) {
    case 1: {
      // ClaimBounty
      const agentAddress = redeemer.fields[0] as string;
      console.log(`[indexer] bounty claimed by ${agentAddress}`);
      await publishEvent("bounty:claimed", {
        bounty_id: event.inputUtxoRef,
        agent_address: agentAddress,
        claim_tx: event.txHash,
      });
      break;
    }
    case 3: {
      // SubmitWork
      const resultCid = redeemer.fields[0] as string;
      console.log(`[indexer] work submitted, CID: ${resultCid}`);
      await publishEvent("bounty:submitted", {
        bounty_id: event.inputUtxoRef,
        result_cid: resultCid,
      });
      break;
    }
    case 4: {
      // VerifyAndPay
      console.log(`[indexer] bounty completed, payment released`);
      await publishEvent("bounty:completed", {
        bounty_id: event.inputUtxoRef,
        payment_tx: event.txHash,
      });
      break;
    }
    case 5: {
      // DisputeWork
      console.log(`[indexer] dispute filed`);
      await publishEvent("bounty:disputed", {
        bounty_id: event.inputUtxoRef,
      });
      break;
    }
    case 6: {
      // ResolveDispute
      console.log(`[indexer] dispute resolved`);
      break;
    }
    case 7:
    case 8: {
      // RefundPoster / CancelBounty
      console.log(`[indexer] bounty refunded/cancelled`);
      break;
    }
    default:
      console.log(`[indexer] unhandled redeemer: ${redeemer.action}`);
  }
}
