/**
 * Transaction builder service.
 * Builds unsigned transaction CBOR for all operations using MeshJS.
 * NEVER signs anything — returns raw unsigned CBOR.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BlockfrostProvider,
  MeshTxBuilder,
  deserializeAddress,
  serializePlutusScript,
  mConStr,
  mConStr1,
  mConStr3,
} from "@meshsdk/core";
import type { Data, UTxO, Asset } from "@meshsdk/core";

import { config } from "../config.js";
import { ChainError } from "../middleware/errorHandler.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildTxResult {
  unsignedTxCbor: string;
  feeEstimateLovelace: bigint;
}

interface PlutusBlueprint {
  validators: Array<{
    title: string;
    compiledCode: string;
    hash: string;
  }>;
}

// ---------------------------------------------------------------------------
// Lazy-loaded singletons (provider, script CBOR, addresses)
// ---------------------------------------------------------------------------

let _provider: BlockfrostProvider | undefined;

function getProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(config.BLOCKFROST_API_KEY);
  }
  return _provider;
}

const _scriptCborCache = new Map<string, string>();

function loadScriptCbor(validatorTitle: string): string {
  const cached = _scriptCborCache.get(validatorTitle);
  if (cached) return cached;

  // Try multiple paths: monorepo layout or Docker production layout
  const baseDir = import.meta.dirname ?? new URL(".", import.meta.url).pathname;
  const candidates = [
    resolve(baseDir, "../../../contracts/plutus.json"),  // monorepo: src/services/ -> contracts/
    resolve(baseDir, "../../plutus.json"),                // Docker: dist/services/ -> plutus.json
    resolve(process.cwd(), "plutus.json"),                // cwd fallback
  ];
  const blueprintPath = candidates.find((p) => {
    try { readFileSync(p); return true; } catch { return false; }
  });
  if (!blueprintPath) {
    throw new ChainError("plutus.json not found in any expected location");
  }
  const blueprint: PlutusBlueprint = JSON.parse(
    readFileSync(blueprintPath, "utf-8"),
  );
  const validator = blueprint.validators.find((v) => v.title === validatorTitle);
  if (!validator) {
    throw new ChainError(`Validator "${validatorTitle}" not found in plutus.json`);
  }

  _scriptCborCache.set(validatorTitle, validator.compiledCode);
  return validator.compiledCode;
}

function getBountyRegistryScriptCbor(): string {
  return loadScriptCbor("bounty_registry.bounty_registry.spend");
}

function getAgentWalletScriptCbor(): string {
  return loadScriptCbor("agent_wallet.agent_wallet.spend");
}

/** Derive a Mainnet (networkId 1) script address from compiled CBOR. */
function getScriptAddress(compiledCode: string): string {
  const { address } = serializePlutusScript(
    { code: compiledCode, version: "V3" },
    undefined,
    1, // Mainnet
  );
  return address;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_UTXO_LOVELACE = 2_000_000n;

/** Parse "txHash#outputIndex" into its parts. */
function parseUtxoRef(ref: string): { txHash: string; outputIndex: number } {
  const [txHash, indexStr] = ref.split("#");
  if (!txHash || indexStr === undefined) {
    throw new ChainError(`Invalid UTXO ref format: "${ref}". Expected "txHash#outputIndex".`);
  }
  const outputIndex = Number(indexStr);
  if (!Number.isFinite(outputIndex) || outputIndex < 0) {
    throw new ChainError(`Invalid output index in UTXO ref: "${ref}".`);
  }
  return { txHash, outputIndex };
}

/** Extract the pubkey hash from a bech32 address. */
function addressToPkh(bech32: string): string {
  const deserialized = deserializeAddress(bech32);
  const pkh = deserialized.pubKeyHash;
  if (!pkh) {
    throw new ChainError(`Could not extract pubkey hash from address: ${bech32}`);
  }
  return pkh;
}

/** Fetch UTxOs for an address from Blockfrost via the MeshJS provider. */
async function fetchUtxos(address: string): Promise<UTxO[]> {
  const provider = getProvider();
  const utxos = await provider.fetchAddressUTxOs(address);
  return utxos;
}

/** Create a fresh MeshTxBuilder wired to the Blockfrost provider. */
function createTxBuilder(): MeshTxBuilder {
  const provider = getProvider();
  return new MeshTxBuilder({
    fetcher: provider,
    evaluator: provider,
  });
}

/**
 * Estimate fee from completed tx hex.
 * MeshJS encodes fee in the tx body. We approximate using the standard
 * Cardano fee formula, but the actual fee is embedded in the CBOR by
 * the builder. We return a rough estimate here.
 */
function estimateFee(txHex: string): bigint {
  // Cardano fee ≈ 155381 + 44 * txSizeBytes (linear fee model for mainnet)
  const txSizeBytes = BigInt(txHex.length / 2);
  return 155_381n + 44n * txSizeBytes;
}

// ---------------------------------------------------------------------------
// Transaction Builders
// ---------------------------------------------------------------------------

/**
 * Build a PostBounty transaction.
 * Creates a new bounty UTXO at the BountyRegistry script address.
 */
export async function buildPostBountyTx(params: {
  posterAddress: string;
  rewardLovelace: bigint;
  datum: Data;
}): Promise<BuildTxResult> {
  try {
    const { posterAddress, rewardLovelace, datum } = params;

    const scriptCbor = getBountyRegistryScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    const outputLovelace = rewardLovelace + MIN_UTXO_LOVELACE;
    const outputValue: Asset[] = [
      { unit: "lovelace", quantity: outputLovelace.toString() },
    ];

    // Fetch poster's UTXOs for coin selection
    const posterUtxos = await fetchUtxos(posterAddress);
    if (posterUtxos.length === 0) {
      throw new ChainError("Poster wallet has no UTXOs. Please fund your wallet first.");
    }

    const txBuilder = createTxBuilder();

    txBuilder
      .txOut(scriptAddress, outputValue)
      .txOutInlineDatumValue(datum)
      .selectUtxosFrom(posterUtxos)
      .changeAddress(posterAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build PostBounty tx: ${msg}`);
  }
}

/**
 * Build a ClaimBounty transaction.
 * Spends the bounty UTXO and recreates it with Claimed status.
 */
export async function buildClaimBountyTx(params: {
  bountyUtxoRef: string;
  agentAddress: string;
  currentDatum: Data;
  newDatum: Data;
}): Promise<BuildTxResult> {
  try {
    const { bountyUtxoRef, agentAddress, currentDatum, newDatum } = params;

    const { txHash, outputIndex } = parseUtxoRef(bountyUtxoRef);
    const agentPkh = addressToPkh(agentAddress);
    const scriptCbor = getBountyRegistryScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    // ClaimBounty redeemer: constructor index 1, fields: [agent_address bytes]
    const redeemer: Data = mConStr1([agentPkh]);

    // Fetch the UTXO to get its current value
    const scriptUtxos = await fetchUtxos(scriptAddress);
    const targetUtxo = scriptUtxos.find(
      (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex,
    );
    if (!targetUtxo) {
      throw new ChainError(`Bounty UTXO not found: ${bountyUtxoRef}`);
    }

    // Collateral from agent
    const agentUtxos = await fetchUtxos(agentAddress);
    const collateralUtxo = agentUtxos.find((u) =>
      u.output.amount.some(
        (a) => a.unit === "lovelace" && BigInt(a.quantity) >= 5_000_000n,
      ),
    );
    if (!collateralUtxo) {
      throw new ChainError("No suitable collateral UTXO found for agent");
    }

    const txBuilder = createTxBuilder();

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(txHash, outputIndex, targetUtxo.output.amount, targetUtxo.output.address)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(scriptAddress, targetUtxo.output.amount)
      .txOutInlineDatumValue(newDatum)
      .requiredSignerHash(agentPkh)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .changeAddress(agentAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build ClaimBounty tx: ${msg}`);
  }
}

/**
 * Build a SubmitWork transaction.
 * Updates bounty status to WorkSubmitted with the IPFS result CID.
 */
export async function buildSubmitWorkTx(params: {
  bountyUtxoRef: string;
  agentAddress: string;
  resultIpfsCid: string;
  currentDatum: Data;
  newDatum: Data;
}): Promise<BuildTxResult> {
  try {
    const { bountyUtxoRef, agentAddress, resultIpfsCid, newDatum } = params;

    const { txHash, outputIndex } = parseUtxoRef(bountyUtxoRef);
    const agentPkh = addressToPkh(agentAddress);
    const scriptCbor = getBountyRegistryScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    // SubmitWork redeemer: constructor index 3, fields: [result_ipfs bytes]
    const redeemer: Data = mConStr3([resultIpfsCid]);

    // Fetch the UTXO
    const scriptUtxos = await fetchUtxos(scriptAddress);
    const targetUtxo = scriptUtxos.find(
      (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex,
    );
    if (!targetUtxo) {
      throw new ChainError(`Bounty UTXO not found: ${bountyUtxoRef}`);
    }

    // Collateral from agent
    const agentUtxos = await fetchUtxos(agentAddress);
    const collateralUtxo = agentUtxos.find((u) =>
      u.output.amount.some(
        (a) => a.unit === "lovelace" && BigInt(a.quantity) >= 5_000_000n,
      ),
    );
    if (!collateralUtxo) {
      throw new ChainError("No suitable collateral UTXO found for agent");
    }

    const txBuilder = createTxBuilder();

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(txHash, outputIndex, targetUtxo.output.amount, targetUtxo.output.address)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(scriptAddress, targetUtxo.output.amount)
      .txOutInlineDatumValue(newDatum)
      .requiredSignerHash(agentPkh)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .changeAddress(agentAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build SubmitWork tx: ${msg}`);
  }
}

/**
 * Build a VerifyAndPay transaction.
 * Releases the bounty reward payment to the agent.
 */
export async function buildVerifyAndPayTx(params: {
  bountyUtxoRef: string;
  agentAddress: string;
  posterAddress: string;
  rewardLovelace: bigint;
  currentDatum: Data;
}): Promise<BuildTxResult> {
  try {
    const { bountyUtxoRef, agentAddress, posterAddress, rewardLovelace, currentDatum } = params;

    const { txHash, outputIndex } = parseUtxoRef(bountyUtxoRef);
    const posterPkh = addressToPkh(posterAddress);
    const scriptCbor = getBountyRegistryScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    // VerifyAndPay redeemer: constructor index 4, no fields
    const redeemer: Data = mConStr(4, []);

    // Fetch the UTXO
    const scriptUtxos = await fetchUtxos(scriptAddress);
    const targetUtxo = scriptUtxos.find(
      (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex,
    );
    if (!targetUtxo) {
      throw new ChainError(`Bounty UTXO not found: ${bountyUtxoRef}`);
    }

    // Collateral from poster
    const posterUtxos = await fetchUtxos(posterAddress);
    const collateralUtxo = posterUtxos.find((u) =>
      u.output.amount.some(
        (a) => a.unit === "lovelace" && BigInt(a.quantity) >= 5_000_000n,
      ),
    );
    if (!collateralUtxo) {
      throw new ChainError("No suitable collateral UTXO found for poster");
    }

    const txBuilder = createTxBuilder();

    // Send reward to agent
    const rewardOutput: Asset[] = [
      { unit: "lovelace", quantity: rewardLovelace.toString() },
    ];

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(txHash, outputIndex, targetUtxo.output.amount, targetUtxo.output.address)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(agentAddress, rewardOutput)
      .requiredSignerHash(posterPkh)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .changeAddress(posterAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build VerifyAndPay tx: ${msg}`);
  }
}

/**
 * Build a DisputeWork transaction.
 * Sets bounty status to Disputed.
 */
export async function buildDisputeTx(params: {
  bountyUtxoRef: string;
  posterAddress: string;
  currentDatum: Data;
  newDatum: Data;
}): Promise<BuildTxResult> {
  try {
    const { bountyUtxoRef, posterAddress, newDatum } = params;

    const { txHash, outputIndex } = parseUtxoRef(bountyUtxoRef);
    const posterPkh = addressToPkh(posterAddress);
    const scriptCbor = getBountyRegistryScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    // DisputeWork redeemer: constructor index 5, no fields
    const redeemer: Data = mConStr(5, []);

    // Fetch the UTXO
    const scriptUtxos = await fetchUtxos(scriptAddress);
    const targetUtxo = scriptUtxos.find(
      (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex,
    );
    if (!targetUtxo) {
      throw new ChainError(`Bounty UTXO not found: ${bountyUtxoRef}`);
    }

    // Collateral from poster
    const posterUtxos = await fetchUtxos(posterAddress);
    const collateralUtxo = posterUtxos.find((u) =>
      u.output.amount.some(
        (a) => a.unit === "lovelace" && BigInt(a.quantity) >= 5_000_000n,
      ),
    );
    if (!collateralUtxo) {
      throw new ChainError("No suitable collateral UTXO found for poster");
    }

    const txBuilder = createTxBuilder();

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(txHash, outputIndex, targetUtxo.output.amount, targetUtxo.output.address)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(scriptAddress, targetUtxo.output.amount)
      .txOutInlineDatumValue(newDatum)
      .requiredSignerHash(posterPkh)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .changeAddress(posterAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build DisputeWork tx: ${msg}`);
  }
}

/**
 * Build a simple ADA transfer transaction.
 */
export async function buildSendTx(params: {
  fromAddress: string;
  toAddress: string;
  lovelace: bigint;
}): Promise<BuildTxResult> {
  try {
    const { fromAddress, toAddress, lovelace } = params;

    const outputValue: Asset[] = [
      { unit: "lovelace", quantity: lovelace.toString() },
    ];

    const txBuilder = createTxBuilder();

    txBuilder
      .txOut(toAddress, outputValue)
      .changeAddress(fromAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build Send tx: ${msg}`);
  }
}

/**
 * Build a PolicyUpdate transaction for the AgentWallet.
 * Updates the wallet spending policy datum.
 */
export async function buildPolicyUpdateTx(params: {
  walletAddress: string;
  walletUtxoRef: string;
  currentDatum: Data;
  newPolicyDatum: Data;
}): Promise<BuildTxResult> {
  try {
    const { walletAddress, walletUtxoRef, newPolicyDatum } = params;

    const { txHash, outputIndex } = parseUtxoRef(walletUtxoRef);
    const ownerPkh = addressToPkh(walletAddress);
    const scriptCbor = getAgentWalletScriptCbor();
    const scriptAddress = getScriptAddress(scriptCbor);

    // UpdatePolicy redeemer: constructor index 3, no fields
    const redeemer: Data = mConStr3([]);

    // Fetch the wallet UTXO
    const scriptUtxos = await fetchUtxos(scriptAddress);
    const targetUtxo = scriptUtxos.find(
      (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex,
    );
    if (!targetUtxo) {
      throw new ChainError(`Wallet UTXO not found: ${walletUtxoRef}`);
    }

    // Collateral from owner
    const ownerUtxos = await fetchUtxos(walletAddress);
    const collateralUtxo = ownerUtxos.find((u) =>
      u.output.amount.some(
        (a) => a.unit === "lovelace" && BigInt(a.quantity) >= 5_000_000n,
      ),
    );
    if (!collateralUtxo) {
      throw new ChainError("No suitable collateral UTXO found for wallet owner");
    }

    const txBuilder = createTxBuilder();

    txBuilder
      .spendingPlutusScriptV3()
      .txIn(txHash, outputIndex, targetUtxo.output.amount, targetUtxo.output.address)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(scriptAddress, targetUtxo.output.amount)
      .txOutInlineDatumValue(newPolicyDatum)
      .requiredSignerHash(ownerPkh)
      .txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address,
      )
      .changeAddress(walletAddress);

    const unsignedTxCbor = await txBuilder.complete();
    const feeEstimateLovelace = estimateFee(unsignedTxCbor);

    return { unsignedTxCbor, feeEstimateLovelace };
  } catch (error) {
    if (error instanceof ChainError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ChainError(`Failed to build PolicyUpdate tx: ${msg}`);
  }
}
