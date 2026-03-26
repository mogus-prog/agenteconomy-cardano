import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock MeshJS modules before importing AgentWallet
const mockSignData = vi.fn().mockResolvedValue({
  signature: "a1b2c3d4",
  key: "pub_key_hex_mock",
});
const mockSignTx = vi.fn().mockResolvedValue("signed_cbor_hex");
const mockSubmitTx = vi.fn().mockResolvedValue("tx_hash_abc123");
const mockGetChangeAddress = vi.fn().mockReturnValue("addr1qz_mock_address");

const mockMeshWalletInstance = {
  getChangeAddress: mockGetChangeAddress,
  signData: mockSignData,
  signTx: mockSignTx,
  submitTx: mockSubmitTx,
};

vi.mock("@meshsdk/wallet", () => ({
  MeshWallet: class MockMeshWallet {
    constructor() {
      Object.assign(this, mockMeshWalletInstance);
    }
    getChangeAddress = mockGetChangeAddress;
    signData = mockSignData;
    signTx = mockSignTx;
    submitTx = mockSubmitTx;
    static brew(_privateKey?: boolean, _strength?: number): string[] {
      return Array.from({ length: 24 }, (_, i) => `word${i + 1}`);
    }
  },
}));

vi.mock("@meshsdk/core", () => ({
  BlockfrostProvider: class MockBlockfrostProvider {
    constructor(_apiKey: string) {}
  },
}));

// Mock fs/promises for fromKeyFile
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      type: "PaymentSigningKeyShelley_ed25519",
      description: "Payment Signing Key",
      cborHex: "5820abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    }),
  ),
}));

import { AgentWallet } from "../src/AgentWallet.js";

describe("AgentWallet", () => {
  const config = {
    blockfrostApiKey: "test_key",
    network: "mainnet" as const,
    apiUrl: "http://localhost:3000",
  };

  describe("create", () => {
    it("should create a new wallet with 24-word mnemonic", async () => {
      const { wallet, mnemonic } = await AgentWallet.create(config);
      expect(mnemonic).toHaveLength(24);
      expect(wallet).toBeInstanceOf(AgentWallet);
    });

    it("should return a valid address", async () => {
      const { wallet } = await AgentWallet.create(config);
      const address = await wallet.getAddress();
      expect(address).toBeTruthy();
      expect(typeof address).toBe("string");
    });
  });

  describe("fromMnemonic", () => {
    it("should restore wallet from 24-word mnemonic", async () => {
      const mnemonic = Array.from({ length: 24 }, () => "abandon");
      const wallet = await AgentWallet.fromMnemonic(mnemonic, config);
      expect(wallet).toBeInstanceOf(AgentWallet);
    });

    it("should reject invalid mnemonic length", async () => {
      const mnemonic = ["abandon", "abandon"];
      await expect(
        AgentWallet.fromMnemonic(mnemonic, config),
      ).rejects.toThrow("Mnemonic must be 24 words");
    });
  });

  describe("fromKeyFile", () => {
    it("should create wallet from key file path", async () => {
      const wallet = await AgentWallet.fromKeyFile("test.skey", config);
      expect(wallet).toBeInstanceOf(AgentWallet);
    });
  });

  describe("signMessage / verifyMessage", () => {
    it("should sign and verify a message", async () => {
      const { wallet } = await AgentWallet.create(config);
      const sig = await wallet.signMessage({ message: "hello" });
      expect(sig.signature).toBeTruthy();
      expect(sig.pubKey).toBeTruthy();

      const valid = await wallet.verifyMessage({
        message: "hello",
        signature: sig.signature,
        pubKey: sig.pubKey,
      });
      expect(valid).toBe(true);
    });
  });

  describe("estimateFee", () => {
    it("should return a reasonable fee estimate", async () => {
      const { wallet } = await AgentWallet.create(config);
      const fee = await wallet.estimateFee({
        to: "addr1qz_recipient",
        lovelace: 5_000_000n,
      });
      expect(fee).toBeGreaterThan(0n);
      expect(fee).toBeLessThan(1_000_000n);
    });
  });

  describe("checkPolicyCompliance", () => {
    it("should return compliant when API unavailable", async () => {
      const { wallet } = await AgentWallet.create(config);
      const check = await wallet.checkPolicyCompliance({
        to: "addr1qz_recipient",
        lovelace: 5_000_000n,
      });
      expect(check.compliant).toBe(true);
    });
  });

  describe("onPaymentReceived", () => {
    it("should register callback without error", async () => {
      const { wallet } = await AgentWallet.create(config);
      const callback = vi.fn();
      expect(() => wallet.onPaymentReceived(callback)).not.toThrow();
    });
  });

  describe("onLowBalance", () => {
    it("should register callback without error", async () => {
      const { wallet } = await AgentWallet.create(config);
      const callback = vi.fn();
      expect(() =>
        wallet.onLowBalance({ threshold: 5_000_000n, callback }),
      ).not.toThrow();
    });
  });
});
