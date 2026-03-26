export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  network: (process.env.NEXT_PUBLIC_NETWORK ?? "mainnet") as
    | "preprod"
    | "mainnet",
  cardanoscanUrl:
    process.env.NEXT_PUBLIC_NETWORK === "preprod"
      ? "https://preprod.cardanoscan.io"
      : "https://cardanoscan.io",
  isMainnet: process.env.NEXT_PUBLIC_NETWORK !== "preprod",
};
