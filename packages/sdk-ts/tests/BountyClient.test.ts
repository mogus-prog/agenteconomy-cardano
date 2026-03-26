import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock MeshJS modules before importing AgentWallet / BountyClient
vi.mock("@meshsdk/wallet", () => ({
  MeshWallet: class MockMeshWallet {
    getChangeAddress() { return "addr_test1qz_mock_address"; }
    signData() { return Promise.resolve({ signature: "a1b2", key: "pub_mock" }); }
    signTx() { return Promise.resolve("signed_cbor"); }
    submitTx() { return Promise.resolve("tx_hash_mock"); }
    static brew() { return Array.from({ length: 24 }, (_, i) => `word${i + 1}`); }
  },
}));

vi.mock("@meshsdk/core", () => ({
  BlockfrostProvider: class MockBlockfrostProvider {
    constructor(_apiKey: string) {}
  },
}));

import { BountyClient } from "../src/BountyClient.js";
import { AgentWallet } from "../src/AgentWallet.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("BountyClient", () => {
  let client: BountyClient;
  let wallet: AgentWallet;

  beforeEach(async () => {
    mockFetch.mockReset();
    const result = await AgentWallet.create({
      blockfrostApiKey: "test_key",
      network: "preprod",
      apiUrl: "http://localhost:3000",
    });
    wallet = result.wallet;
    client = new BountyClient({
      wallet,
      apiUrl: "http://localhost:3000",
      network: "preprod",
    });
  });

  describe("discoverBounties", () => {
    it("should fetch bounties with no filter", async () => {
      const mockBounties = [
        { bountyId: "1", title: "Test Bounty", status: { type: "Open" } },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBounties),
      });

      const bounties = await client.discoverBounties();
      expect(bounties).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/bounties"),
      );
    });

    it("should pass filters as query params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.discoverBounties({
        category: "DataExtraction",
        minReward: 5_000_000n,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("category=DataExtraction");
      expect(calledUrl).toContain("min_reward=5000000");
    });

    it("should throw on API error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(client.discoverBounties()).rejects.toThrow("500");
    });
  });

  describe("getBounty", () => {
    it("should fetch a single bounty by ID", async () => {
      const mockBounty = { bountyId: "abc", title: "Test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBounty),
      });

      const bounty = await client.getBounty("abc");
      expect(bounty.bountyId).toBe("abc");
    });
  });

  describe("getBountySpec", () => {
    it("should fetch bounty spec from API", async () => {
      const mockSpec = {
        title: "Test",
        description: "Test desc",
        instructions: "Do the thing",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSpec),
      });

      const spec = await client.getBountySpec("abc");
      expect(spec.title).toBe("Test");
    });
  });

  describe("claimBounty", () => {
    it("should fail claim when not eligible", async () => {
      // Mock getBounty for eligibility check fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.claimBounty("b1")).rejects.toThrow(
        "Not eligible",
      );
    });
  });

  describe("submitWork", () => {
    it("should upload result and submit work tx", async () => {
      // Mock build-submit-work
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              unsignedTxCbor: "unsigned_cbor",
              ipfsCid: "bafybei_result",
            }),
        })
        // Mock submit-work
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tx_hash: "submit_tx_hash",
              submitted_at: 1700000001000,
            }),
        });

      const result = await client.submitWork("b1", { data: "test result" });
      expect(result.txHash).toBe("submit_tx_hash");
      expect(result.ipfsCid).toBe("bafybei_result");
    });
  });

  describe("verifyAndPay", () => {
    it("should call verify-and-pay endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ txHash: "verify_tx" }),
      });

      const txHash = await client.verifyAndPay("b1");
      expect(txHash).toBe("verify_tx");
    });
  });

  describe("getLeaderboard", () => {
    it("should fetch leaderboard", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { address: "addr1", rank: 1, totalEarned: "100000000" },
          ]),
      });

      const leaders = await client.getLeaderboard({ limit: 10 });
      expect(leaders).toHaveLength(1);
    });
  });

  describe("checkEligibility", () => {
    it("should return not eligible on API failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await client.checkEligibility("b1");
      expect(result.eligible).toBe(false);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await client.checkEligibility("b1");
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Network error");
    });
  });
});
