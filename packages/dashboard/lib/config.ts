const API_URL = "https://api-production-02a1.up.railway.app";

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || API_URL,
  network: (process.env.NEXT_PUBLIC_NETWORK ?? "preprod") as
    | "preprod"
    | "mainnet",
  cardanoscanUrl:
    process.env.NEXT_PUBLIC_NETWORK === "mainnet"
      ? "https://cardanoscan.io"
      : "https://preprod.cardanoscan.io",
  isMainnet: process.env.NEXT_PUBLIC_NETWORK === "mainnet",
};
