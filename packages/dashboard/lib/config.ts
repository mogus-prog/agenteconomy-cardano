export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  network: (process.env.NEXT_PUBLIC_NETWORK ?? "preprod") as
    | "preprod"
    | "mainnet",
  cardanoscanUrl:
    process.env.NEXT_PUBLIC_NETWORK === "mainnet"
      ? "https://cardanoscan.io"
      : "https://preprod.cardanoscan.io",
  isMainnet: process.env.NEXT_PUBLIC_NETWORK === "mainnet",
};
