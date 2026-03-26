/**
 * Encodes bounty parameters into Plutus Data for inline datums.
 * Uses MeshJS constr() encoding matching the Aiken BountyDatum type.
 */

import { mConStr0, mConStr1, mConStr, stringToHex } from "@meshsdk/core";
import type { Data } from "@meshsdk/core";

interface BountyDatumParams {
  title: string;
  descriptionIpfs: string;
  category: string;
  difficulty: string;
  rewardLovelace: bigint;
  deadline: string;
  verificationType: string;
  posterAddress: string;
  tags: string[];
}

const CATEGORY_INDEX: Record<string, number> = {
  dataextraction: 0,
  codegen: 1,
  research: 2,
  content: 3,
  onchain: 4,
  translation: 5,
  moderation: 6,
};

const DIFFICULTY_INDEX: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

const VERIFICATION_INDEX: Record<string, number> = {
  auto: 0,      // Optimistic
  manual: 1,    // HumanReview
  oracle: 2,    // OracleSigned
};

/**
 * Encode bounty parameters into a Plutus Data structure matching BountyDatum.
 * The constructor ordering matches the Aiken type definition.
 */
export function encodeBountyDatum(params: BountyDatumParams): Data {
  const categoryIdx = CATEGORY_INDEX[params.category.toLowerCase()] ?? 0;
  const difficultyIdx = DIFFICULTY_INDEX[params.difficulty.toLowerCase()] ?? 1;
  const verificationIdx = VERIFICATION_INDEX[params.verificationType.toLowerCase()] ?? 0;

  const deadlineMs = new Date(params.deadline).getTime();

  // BountyDatum as constr(0, [...fields])
  // Fields ordered to match Aiken struct:
  // poster, title, description_ipfs, category, difficulty,
  // reward_lovelace, bond_lovelace, deadline, claim_window_ms,
  // dispute_window_ms, verification_type, status, tags,
  // min_reputation_score, reward_token, result_schema_ipfs,
  // max_submissions, created_at, bounty_id, nonce
  return mConStr0([
    // poster (as hex-encoded address bytes)
    stringToHex(params.posterAddress),
    // title
    stringToHex(params.title),
    // description_ipfs
    stringToHex(params.descriptionIpfs),
    // category (sum type)
    mConStr(categoryIdx, []),
    // difficulty (sum type)
    mConStr(difficultyIdx, []),
    // reward_lovelace
    params.rewardLovelace,
    // bond_lovelace (10% of reward)
    params.rewardLovelace / 10n,
    // deadline (POSIX ms)
    BigInt(deadlineMs),
    // claim_window_ms (24 hours)
    BigInt(86_400_000),
    // dispute_window_ms (30 minutes)
    BigInt(1_800_000),
    // verification_type (sum type)
    mConStr(verificationIdx, []),
    // status = Open (constr 0)
    mConStr0([]),
    // tags (list of hex-encoded strings)
    params.tags.map((t) => stringToHex(t)),
    // min_reputation_score (None)
    mConStr1([]),
    // reward_token (None)
    mConStr1([]),
    // result_schema_ipfs (None)
    mConStr1([]),
    // max_submissions (1)
    1n,
    // created_at (now in POSIX ms)
    BigInt(Date.now()),
    // bounty_id (hex of title hash - simplified)
    stringToHex(`bounty-${Date.now()}`),
    // nonce
    0n,
  ]);
}
