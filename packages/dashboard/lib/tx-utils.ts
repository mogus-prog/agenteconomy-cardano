/**
 * Shared Cardano transaction utilities for CIP-30 wallet interaction.
 * Assembles signed transactions from unsigned CBOR + witness sets.
 */

/**
 * Assemble a signed Cardano transaction from unsigned tx CBOR and witness set.
 * CIP-30 signTx() returns only the witness set, not the full tx.
 * The unsigned tx is CBOR: 84 [body, emptyWitnesses, true, null]
 * We replace the empty witnesses with the signed witness set.
 */
export function assembleSignedTx(unsignedTxHex: string, witnessSetHex: string): string {
  const unsignedBytes = hexToBytes(unsignedTxHex);
  const witnessBytes = hexToBytes(witnessSetHex);

  let pos = 1; // skip 84 (array of 4)
  const bodyStart = pos;
  pos = skipCborItem(unsignedBytes, pos);
  const bodyEnd = pos;
  pos = skipCborItem(unsignedBytes, pos); // skip empty witness set
  const trailingBytes = unsignedBytes.slice(pos);
  const bodyBytes = unsignedBytes.slice(bodyStart, bodyEnd);

  const result = new Uint8Array(1 + bodyBytes.length + witnessBytes.length + trailingBytes.length);
  result[0] = 0x84;
  result.set(bodyBytes, 1);
  result.set(witnessBytes, 1 + bodyBytes.length);
  result.set(trailingBytes, 1 + bodyBytes.length + witnessBytes.length);
  return bytesToHex(result);
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function skipCborItem(data: Uint8Array, pos: number): number {
  const major = data[pos] >> 5;
  const additional = data[pos] & 0x1f;
  pos++;
  let length: number;
  if (additional < 24) length = additional;
  else if (additional === 24) { length = data[pos++]; }
  else if (additional === 25) { length = (data[pos] << 8) | data[pos + 1]; pos += 2; }
  else if (additional === 26) { length = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]; pos += 4; }
  else if (additional === 27) { pos += 4; length = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]; pos += 4; }
  else if (additional === 31) {
    while (data[pos] !== 0xff) pos = skipCborItem(data, pos);
    pos++;
    return pos;
  } else return pos;
  switch (major) {
    case 0: case 1: case 7: return pos;
    case 2: case 3: return pos + length;
    case 4: for (let i = 0; i < length; i++) pos = skipCborItem(data, pos); return pos;
    case 5: for (let i = 0; i < length; i++) { pos = skipCborItem(data, pos); pos = skipCborItem(data, pos); } return pos;
    case 6: return skipCborItem(data, pos);
    default: return pos;
  }
}

/**
 * Enables a CIP-30 wallet and returns the API object.
 * Throws descriptive errors if wallet is not found.
 */
export async function enableWallet(walletName: string) {
  const walletKey = walletName.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardanoApi = (window as any).cardano?.[walletKey];
  if (!cardanoApi) {
    throw new Error(`Wallet "${walletName}" not found. Is the extension installed?`);
  }
  return cardanoApi.enable();
}
