import { createConfig } from "@ponder/core";

export default createConfig({
  networks: {
    cardanoPreprod: {
      chainId: 0, // Cardano Preprod
      transport: {
        type: "http",
        url: process.env.BLOCKFROST_BASE_URL ?? "https://cardano-preprod.blockfrost.io/api/v0",
        headers: {
          project_id: process.env.BLOCKFROST_API_KEY ?? "",
        },
      },
    },
  },
  contracts: {
    BountyRegistry: {
      network: "cardanoPreprod",
      address: process.env.BOUNTY_REGISTRY_ADDRESS ?? "",
      startBlock: Number(process.env.START_BLOCK ?? "0"),
    },
  },
});
