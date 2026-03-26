/**
 * Decode raw Plutus Data from Blockfrost events into typed objects.
 * Uses the plutus.json blueprint for field ordering.
 */

export interface DecodedBountyDatum {
  bountyId: string;
  version: number;
  poster: string;
  title: string;
  descriptionIpfs: string;
  category: number;
  difficulty: number;
  rewardLovelace: bigint;
  status: number;
  createdAt: number;
  [key: string]: unknown;
}

export interface DecodedReputationDatum {
  agentPkh: string;
  totalCompleted: number;
  totalEarnedLovelace: bigint;
  successRateBps: number;
  [key: string]: unknown;
}

export function decodeBountyDatum(rawData: unknown): DecodedBountyDatum {
  // In production: parse Plutus Data CBOR using the blueprint field ordering
  // For now, handle the common JSON structure from Blockfrost
  const data = rawData as Record<string, unknown>;
  const fields = (data?.["fields"] as unknown[]) ?? [];

  return {
    bountyId: (fields[0] as string) ?? "",
    version: Number(fields[1] ?? 1),
    poster: (fields[2] as string) ?? "",
    title: (fields[3] as string) ?? "",
    descriptionIpfs: (fields[4] as string) ?? "",
    category: getConstructorIndex(fields[5]),
    difficulty: getConstructorIndex(fields[6]),
    rewardLovelace: BigInt(String(fields[7] ?? "0")),
    status: getConstructorIndex(fields[17]),
    createdAt: Number(fields[18] ?? 0),
  };
}

export function decodeReputationDatum(rawData: unknown): DecodedReputationDatum {
  const data = rawData as Record<string, unknown>;
  const fields = (data?.["fields"] as unknown[]) ?? [];

  return {
    agentPkh: (fields[0] as string) ?? "",
    totalCompleted: Number(fields[1] ?? 0),
    totalEarnedLovelace: BigInt(String(fields[2] ?? "0")),
    successRateBps: Number(fields[4] ?? 0),
  };
}

function getConstructorIndex(data: unknown): number {
  if (typeof data === "object" && data !== null && "constructor" in data) {
    return (data as { constructor: number }).constructor;
  }
  return 0;
}
