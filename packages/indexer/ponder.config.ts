import { createConfig } from "@ponder/core";

export default createConfig({
  networks: {
    cardanoMainnet: {
      chainId: 1, // Cardano Mainnet
      transport: {
        type: "http",
        url: process.env.BLOCKFROST_BASE_URL ?? "https://cardano-mainnet.blockfrost.io/api/v0",
        headers: {
          project_id: process.env.BLOCKFROST_API_KEY ?? "",
        },
      },
    },
  },
  contracts: {
    BountyRegistry: {
      network: "cardanoMainnet",
      address: process.env.BOUNTY_REGISTRY_ADDRESS ?? "",
      startBlock: Number(process.env.START_BLOCK ?? "0"),
    },
  },
});
