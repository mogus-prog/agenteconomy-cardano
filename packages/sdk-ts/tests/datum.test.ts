import { describe, it, expect } from "vitest";
import {
  encodeBountyDatum,
  decodeBountyDatum,
  encodeWalletPolicyDatum,
  decodeWalletPolicyDatum,
  encodeReputationDatum,
  decodeReputationDatum,
  encodeBountyRedeemer,
} from "../src/utils/datum.js";
import type {
  BountyDatum,
  WalletPolicyDatum,
  ReputationDatum,
  BountyRedeemer,
} from "../src/types.js";

const sampleBountyDatum: BountyDatum = {
  bountyId: "abc123",
  version: 1,
  poster: "addr1qz_poster",
  title: "Fetch ADA price",
  descriptionIpfs: "bafybei_spec",
  category: "DataExtraction",
  difficulty: "Medium",
  rewardLovelace: 5_000_000n,
  rewardToken: null,
  depositLovelace: 2_000_000n,
  deadline: 1700000000000,
  claimWindowMs: 3600000,
  verification: { type: "Optimistic", disputeWindowMs: 1800000 },
  disputeWindowMs: 1800000,
  resultSchemaIpfs: null,
  allowedAgents: null,
  minReputationScore: null,
  status: { type: "Open" },
  createdAt: 1699000000000,
  metadataHash: "sha256_hash",
};

const sampleWalletPolicy: WalletPolicyDatum = {
  ownerPkh: "owner_pkh_hex",
  agentPkh: "agent_pkh_hex",
  dailyLimitLovelace: 50_000_000n,
  perTxLimitLovelace: 10_000_000n,
  whitelistedScripts: ["script_hash_1"],
  whitelistedAddresses: ["addr_hash_1"],
  requireOwnerAbove: 20_000_000n,
  allowedTokens: [{ policyId: "policy1", assetName: "iUSD" }],
  maxFeeLovelace: 500_000n,
  pauseUntil: null,
  multisigThreshold: null,
  nonce: 0,
  policyVersion: 1,
};

const sampleReputation: ReputationDatum = {
  agentPkh: "agent_pkh_hex",
  totalCompleted: 10,
  totalEarnedLovelace: 50_000_000n,
  totalDisputed: 1,
  successRateBps: 9000,
  avgCompletionMs: 120000,
  categoryScores: [{ categoryId: "01", scoreBps: 8500 }],
  lastActive: 1700000000000,
  badgeTokens: ["badge_policy_1"],
  registeredAt: 1690000000000,
};

describe("BountyDatum encode/decode round-trip", () => {
  it("should round-trip Open status", () => {
    const encoded = encodeBountyDatum(sampleBountyDatum);
    const decoded = decodeBountyDatum(encoded);
    expect(decoded.bountyId).toBe(sampleBountyDatum.bountyId);
    expect(decoded.category).toBe("DataExtraction");
    expect(decoded.difficulty).toBe("Medium");
    expect(decoded.rewardLovelace).toBe(5_000_000n);
    expect(decoded.status).toEqual({ type: "Open" });
    expect(decoded.rewardToken).toBeNull();
  });

  it("should round-trip Claimed status", () => {
    const datum: BountyDatum = {
      ...sampleBountyDatum,
      status: { type: "Claimed", agent: "agent_addr", claimedAt: 1700000001000 },
    };
    const decoded = decodeBountyDatum(encodeBountyDatum(datum));
    expect(decoded.status).toEqual({
      type: "Claimed",
      agent: "agent_addr",
      claimedAt: 1700000001000,
    });
  });

  it("should round-trip WorkSubmitted status", () => {
    const datum: BountyDatum = {
      ...sampleBountyDatum,
      status: { type: "WorkSubmitted", resultIpfs: "bafybei_result", submittedAt: 1700000002000 },
    };
    const decoded = decodeBountyDatum(encodeBountyDatum(datum));
    expect(decoded.status.type).toBe("WorkSubmitted");
  });

  it("should round-trip with reward token", () => {
    const datum: BountyDatum = {
      ...sampleBountyDatum,
      rewardToken: { policyId: "abc", assetName: "iUSD" },
    };
    const decoded = decodeBountyDatum(encodeBountyDatum(datum));
    expect(decoded.rewardToken).toEqual({ policyId: "abc", assetName: "iUSD" });
  });

  it("should round-trip with allowed agents", () => {
    const datum: BountyDatum = {
      ...sampleBountyDatum,
      allowedAgents: ["agent1", "agent2"],
    };
    const decoded = decodeBountyDatum(encodeBountyDatum(datum));
    expect(decoded.allowedAgents).toEqual(["agent1", "agent2"]);
  });

  it("should round-trip with min reputation", () => {
    const datum: BountyDatum = {
      ...sampleBountyDatum,
      minReputationScore: 5000,
    };
    const decoded = decodeBountyDatum(encodeBountyDatum(datum));
    expect(decoded.minReputationScore).toBe(5000);
  });

  it("should round-trip all verification types", () => {
    const verifications = [
      { type: "Optimistic" as const, disputeWindowMs: 1800000 },
      { type: "HumanReview" as const },
      { type: "OracleSigned" as const, oraclePubKey: "oracle_key" },
      { type: "JudgeAgent" as const },
    ];
    for (const v of verifications) {
      const datum: BountyDatum = { ...sampleBountyDatum, verification: v };
      const decoded = decodeBountyDatum(encodeBountyDatum(datum));
      expect(decoded.verification.type).toBe(v.type);
    }
  });

  it("should round-trip all categories", () => {
    const categories = [
      "DataExtraction", "CodeGen", "Research", "Content",
      "OnChain", "Translation", "Moderation",
    ] as const;
    for (const cat of categories) {
      const datum: BountyDatum = { ...sampleBountyDatum, category: cat };
      const decoded = decodeBountyDatum(encodeBountyDatum(datum));
      expect(decoded.category).toBe(cat);
    }
  });
});

describe("WalletPolicyDatum encode/decode round-trip", () => {
  it("should round-trip basic policy", () => {
    const encoded = encodeWalletPolicyDatum(sampleWalletPolicy);
    const decoded = decodeWalletPolicyDatum(encoded);
    expect(decoded.ownerPkh).toBe("owner_pkh_hex");
    expect(decoded.agentPkh).toBe("agent_pkh_hex");
    expect(decoded.dailyLimitLovelace).toBe(50_000_000n);
    expect(decoded.perTxLimitLovelace).toBe(10_000_000n);
    expect(decoded.nonce).toBe(0);
    expect(decoded.pauseUntil).toBeNull();
    expect(decoded.multisigThreshold).toBeNull();
  });

  it("should round-trip with pause", () => {
    const policy: WalletPolicyDatum = {
      ...sampleWalletPolicy,
      pauseUntil: 1700000000000,
    };
    const decoded = decodeWalletPolicyDatum(encodeWalletPolicyDatum(policy));
    expect(decoded.pauseUntil).toBe(1700000000000);
  });

  it("should round-trip with multisig", () => {
    const policy: WalletPolicyDatum = {
      ...sampleWalletPolicy,
      multisigThreshold: { n: 2, keys: ["key1", "key2", "key3"] },
    };
    const decoded = decodeWalletPolicyDatum(encodeWalletPolicyDatum(policy));
    expect(decoded.multisigThreshold?.n).toBe(2);
    expect(decoded.multisigThreshold?.keys).toHaveLength(3);
  });
});

describe("ReputationDatum encode/decode round-trip", () => {
  it("should round-trip reputation datum", () => {
    const encoded = encodeReputationDatum(sampleReputation);
    const decoded = decodeReputationDatum(encoded);
    expect(decoded.agentPkh).toBe("agent_pkh_hex");
    expect(decoded.totalCompleted).toBe(10);
    expect(decoded.totalEarnedLovelace).toBe(50_000_000n);
    expect(decoded.successRateBps).toBe(9000);
    expect(decoded.categoryScores).toHaveLength(1);
    expect(decoded.badgeTokens).toEqual(["badge_policy_1"]);
  });
});

describe("BountyRedeemer encoding", () => {
  it("should encode all redeemer types", () => {
    const redeemers: BountyRedeemer[] = [
      { type: "PostBounty" },
      { type: "ClaimBounty", agentAddress: "agent_addr" },
      { type: "ExtendClaim", newClaimWindowMs: 7200000 },
      { type: "SubmitWork", resultIpfs: "bafybei_result" },
      { type: "VerifyAndPay" },
      { type: "DisputeWork" },
      { type: "ResolveDispute", winner: "agent_addr" },
      { type: "RefundPoster" },
      { type: "CancelBounty" },
      { type: "UpdateBounty", newTitle: "New Title", newDescriptionIpfs: "bafybei_new" },
    ];
    for (const r of redeemers) {
      const encoded = encodeBountyRedeemer(r);
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe("object");
    }
  });
});
