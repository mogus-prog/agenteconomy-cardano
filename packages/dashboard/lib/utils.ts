import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert lovelace (bigint string or number) to ADA display */
export function lovelaceToAda(lovelace: string | number | bigint): number {
  return Number(BigInt(lovelace)) / 1_000_000;
}

/** Format ADA amount with symbol */
export function formatAda(lovelace: string | number | bigint): string {
  const ada = lovelaceToAda(lovelace);
  return `${ada.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₳`;
}

/** Truncate a Cardano address for display */
export function truncateAddress(address: string, start = 8, end = 6): string {
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/** Get CardanoScan URL for an address or tx hash */
export function cardanoscanUrl(hashOrAddress: string, type: "transaction" | "address" = "transaction"): string {
  const base = process.env.NEXT_PUBLIC_NETWORK === "mainnet"
    ? "https://cardanoscan.io"
    : "https://preprod.cardanoscan.io";
  return `${base}/${type}/${hashOrAddress}`;
}
