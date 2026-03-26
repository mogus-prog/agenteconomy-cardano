// ─────────────────────────────────────────────────────────
// Plutus Data encoding/decoding for all datum types
// ─────────────────────────────────────────────────────────

import type {
  BountyDatum,
  BountyRedeemer,
  BountyStatus,
  VerificationType,
  WalletPolicyDatum,
  ReputationDatum,
  BountyCategory,
  Difficulty,
} from "../types.js";

export interface Constr {
  constructor: number;
  fields: PlutusData[];
}

// Re-export a type alias for Plutus Data representation
export type PlutusData =
  | Constr
  | number
  | bigint
  | string
  | PlutusData[]
  | Map<PlutusData, PlutusData>;

function constr(index: number, fields: PlutusData[]): Constr {
  return { constructor: index, fields };
}

function isConstr(data: PlutusData): data is Constr {
  return typeof data === "object" && data !== null && !Array.isArray(data) && !(data instanceof Map) && "constructor" in data;
}

function optionToData(val: unknown, encoder?: (v: unknown) => PlutusData): Constr {
  if (val === null || val === undefined) {
    return constr(1, []); // None
  }
  const encoded = encoder ? encoder(val) : (val as PlutusData);
  return constr(0, [encoded]); // Some(val)
}

function dataToOption<T>(data: PlutusData, decoder: (d: PlutusData) => T): T | null {
  if (isConstr(data)) {
    if (data.constructor === 1) return null; // None
    if (data.constructor === 0 && data.fields.length > 0) {
      return decoder(data.fields[0]!);
    }
  }
  return null;
}

// ── Category encoding ───────────────────────────────────

const CATEGORY_INDEX: Record<BountyCategory, number> = {
  DataExtraction: 0,
  CodeGen: 1,
  Research: 2,
  Content: 3,
  OnChain: 4,
  Translation: 5,
  Moderation: 6,
};

const INDEX_CATEGORY: BountyCategory[] = [
  "DataExtraction", "CodeGen", "Research", "Content",
  "OnChain", "Translation", "Moderation",
];

function encodeCategory(cat: BountyCategory): PlutusData {
  return constr(CATEGORY_INDEX[cat], []);
}

function decodeCategory(data: PlutusData): BountyCategory {
  if (isConstr(data)) {
    const cat = INDEX_CATEGORY[data.constructor];
    if (cat) return cat;
  }
  throw new Error(`Invalid category data: ${JSON.stringify(data)}`);
}

// ── Difficulty encoding ─────────────────────────────────

const DIFFICULTY_INDEX: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
  Expert: 3,
};

const INDEX_DIFFICULTY: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

function encodeDifficulty(diff: Difficulty): PlutusData {
  return constr(DIFFICULTY_INDEX[diff], []);
}

function decodeDifficulty(data: PlutusData): Difficulty {
  if (isConstr(data)) {
    const diff = INDEX_DIFFICULTY[data.constructor];
    if (diff) return diff;
  }
  throw new Error(`Invalid difficulty data: ${JSON.stringify(data)}`);
}

// ── VerificationType encoding ───────────────────────────

function encodeVerification(v: VerificationType): PlutusData {
  switch (v.type) {
    case "Optimistic":
      return constr(0, [BigInt(v.disputeWindowMs)]);
    case "HumanReview":
      return constr(1, []);
    case "OracleSigned":
      return constr(2, [v.oraclePubKey]);
    case "JudgeAgent":
      return constr(3, []);
  }
}

function decodeVerification(data: PlutusData): VerificationType {
  if (isConstr(data)) {
    switch (data.constructor) {
      case 0:
        return { type: "Optimistic", disputeWindowMs: Number(data.fields[0]) };
      case 1:
        return { type: "HumanReview" };
      case 2:
        return { type: "OracleSigned", oraclePubKey: data.fields[0] as string };
      case 3:
        return { type: "JudgeAgent" };
    }
  }
  throw new Error(`Invalid verification data: ${JSON.stringify(data)}`);
}

// ── BountyStatus encoding ───────────────────────────────

function encodeStatus(s: BountyStatus): PlutusData {
  switch (s.type) {
    case "Open":
      return constr(0, []);
    case "Claimed":
      return constr(1, [s.agent, BigInt(s.claimedAt)]);
    case "WorkSubmitted":
      return constr(2, [s.resultIpfs, BigInt(s.submittedAt)]);
    case "Completed":
      return constr(3, [s.resultIpfs, BigInt(s.completedAt)]);
    case "Disputed":
      return constr(4, []);
    case "Refunded":
      return constr(5, []);
  }
}

function decodeStatus(data: PlutusData): BountyStatus {
  if (isConstr(data)) {
    switch (data.constructor) {
      case 0:
        return { type: "Open" };
      case 1:
        return {
          type: "Claimed",
          agent: data.fields[0] as string,
          claimedAt: Number(data.fields[1]),
        };
      case 2:
        return {
          type: "WorkSubmitted",
          resultIpfs: data.fields[0] as string,
          submittedAt: Number(data.fields[1]),
        };
      case 3:
        return {
          type: "Completed",
          resultIpfs: data.fields[0] as string,
          completedAt: Number(data.fields[1]),
        };
      case 4:
        return { type: "Disputed" };
      case 5:
        return { type: "Refunded" };
    }
  }
  throw new Error(`Invalid status data: ${JSON.stringify(data)}`);
}

// ── AssetId encoding ────────────────────────────────────

function encodeAssetId(a: { policyId: string; assetName: string }): PlutusData {
  return constr(0, [a.policyId, a.assetName]);
}

function decodeAssetId(data: PlutusData): { policyId: string; assetName: string } {
  if (isConstr(data)) {
    return {
      policyId: data.fields[0] as string,
      assetName: data.fields[1] as string,
    };
  }
  throw new Error(`Invalid asset ID data`);
}

// ── BountyDatum ─────────────────────────────────────────

export function encodeBountyDatum(datum: BountyDatum): PlutusData {
  return constr(0, [
    datum.bountyId,
    BigInt(datum.version),
    datum.poster,
    datum.title,
    datum.descriptionIpfs,
    encodeCategory(datum.category),
    encodeDifficulty(datum.difficulty),
    datum.rewardLovelace,
    optionToData(datum.rewardToken, (v) => encodeAssetId(v as { policyId: string; assetName: string })),
    datum.depositLovelace,
    BigInt(datum.deadline),
    BigInt(datum.claimWindowMs),
    encodeVerification(datum.verification),
    BigInt(datum.disputeWindowMs),
    optionToData(datum.resultSchemaIpfs),
    optionToData(datum.allowedAgents, (v) => (v as string[])),
    optionToData(datum.minReputationScore, (v) => BigInt(v as number)),
    encodeStatus(datum.status),
    BigInt(datum.createdAt),
    datum.metadataHash,
  ]);
}

export function decodeBountyDatum(data: PlutusData): BountyDatum {
  if (!isConstr(data)) {
    throw new Error("Invalid BountyDatum data");
  }
  const f = data.fields;
  return {
    bountyId: f[0] as string,
    version: Number(f[1]),
    poster: f[2] as string,
    title: f[3] as string,
    descriptionIpfs: f[4] as string,
    category: decodeCategory(f[5]!),
    difficulty: decodeDifficulty(f[6]!),
    rewardLovelace: BigInt(f[7] as bigint),
    rewardToken: dataToOption(f[8]!, decodeAssetId),
    depositLovelace: BigInt(f[9] as bigint),
    deadline: Number(f[10]),
    claimWindowMs: Number(f[11]),
    verification: decodeVerification(f[12]!),
    disputeWindowMs: Number(f[13]),
    resultSchemaIpfs: dataToOption(f[14]!, (d) => d as string),
    allowedAgents: dataToOption(f[15]!, (d) => d as string[]),
    minReputationScore: dataToOption(f[16]!, (d) => Number(d)),
    status: decodeStatus(f[17]!),
    createdAt: Number(f[18]),
    metadataHash: f[19] as string,
  };
}

// ── WalletPolicyDatum ───────────────────────────────────

export function encodeWalletPolicyDatum(datum: WalletPolicyDatum): PlutusData {
  return constr(0, [
    datum.ownerPkh,
    datum.agentPkh,
    datum.dailyLimitLovelace,
    datum.perTxLimitLovelace,
    datum.whitelistedScripts,
    datum.whitelistedAddresses,
    datum.requireOwnerAbove,
    datum.allowedTokens.map(encodeAssetId),
    datum.maxFeeLovelace,
    optionToData(datum.pauseUntil, (v) => BigInt(v as number)),
    optionToData(
      datum.multisigThreshold,
      (v) => {
        const ms = v as { n: number; keys: string[] };
        return constr(0, [BigInt(ms.n), ms.keys]);
      },
    ),
    BigInt(datum.nonce),
    BigInt(datum.policyVersion),
  ]);
}

export function decodeWalletPolicyDatum(data: PlutusData): WalletPolicyDatum {
  if (!isConstr(data)) {
    throw new Error("Invalid WalletPolicyDatum data");
  }
  const f = data.fields;
  return {
    ownerPkh: f[0] as string,
    agentPkh: f[1] as string,
    dailyLimitLovelace: BigInt(f[2] as bigint),
    perTxLimitLovelace: BigInt(f[3] as bigint),
    whitelistedScripts: f[4] as string[],
    whitelistedAddresses: f[5] as string[],
    requireOwnerAbove: BigInt(f[6] as bigint),
    allowedTokens: (f[7] as PlutusData[]).map(decodeAssetId),
    maxFeeLovelace: BigInt(f[8] as bigint),
    pauseUntil: dataToOption(f[9]!, (d) => Number(d)),
    multisigThreshold: dataToOption(f[10]!, (d) => {
      if (isConstr(d)) {
        return { n: Number(d.fields[0]), keys: d.fields[1] as string[] };
      }
      throw new Error("Invalid multisig data");
    }),
    nonce: Number(f[11]),
    policyVersion: Number(f[12]),
  };
}

// ── ReputationDatum ─────────────────────────────────────

export function encodeReputationDatum(datum: ReputationDatum): PlutusData {
  return constr(0, [
    datum.agentPkh,
    BigInt(datum.totalCompleted),
    datum.totalEarnedLovelace,
    BigInt(datum.totalDisputed),
    BigInt(datum.successRateBps),
    BigInt(datum.avgCompletionMs),
    datum.categoryScores.map((cs) => [cs.categoryId, BigInt(cs.scoreBps)]),
    BigInt(datum.lastActive),
    datum.badgeTokens,
    BigInt(datum.registeredAt),
  ]);
}

export function decodeReputationDatum(data: PlutusData): ReputationDatum {
  if (!isConstr(data)) {
    throw new Error("Invalid ReputationDatum data");
  }
  const f = data.fields;
  return {
    agentPkh: f[0] as string,
    totalCompleted: Number(f[1]),
    totalEarnedLovelace: BigInt(f[2] as bigint),
    totalDisputed: Number(f[3]),
    successRateBps: Number(f[4]),
    avgCompletionMs: Number(f[5]),
    categoryScores: (f[6] as [string, bigint][]).map(([id, score]) => ({
      categoryId: id,
      scoreBps: Number(score),
    })),
    lastActive: Number(f[7]),
    badgeTokens: f[8] as string[],
    registeredAt: Number(f[9]),
  };
}

// ── BountyRedeemer encoding ─────────────────────────────

export function encodeBountyRedeemer(redeemer: BountyRedeemer): PlutusData {
  switch (redeemer.type) {
    case "PostBounty":
      return constr(0, []);
    case "ClaimBounty":
      return constr(1, [redeemer.agentAddress]);
    case "ExtendClaim":
      return constr(2, [BigInt(redeemer.newClaimWindowMs)]);
    case "SubmitWork":
      return constr(3, [redeemer.resultIpfs]);
    case "VerifyAndPay":
      return constr(4, []);
    case "DisputeWork":
      return constr(5, []);
    case "ResolveDispute":
      return constr(6, [redeemer.winner]);
    case "RefundPoster":
      return constr(7, []);
    case "CancelBounty":
      return constr(8, []);
    case "UpdateBounty":
      return constr(9, [redeemer.newTitle, redeemer.newDescriptionIpfs]);
  }
}
