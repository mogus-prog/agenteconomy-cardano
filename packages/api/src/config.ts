import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/agenteconomy"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Blockfrost
  BLOCKFROST_API_KEY: z.string().default("mainnet_test_key"),
  BLOCKFROST_BASE_URL: z.string().default("https://cardano-mainnet.blockfrost.io/api/v0"),

  // IPFS
  WEB3_STORAGE_TOKEN: z.string().optional(),
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET_KEY: z.string().optional(),

  // Auth
  CLERK_PUBLIC_KEY: z.string().optional(),
  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production"),

  // Smart contract addresses
  BOUNTY_REGISTRY_SCRIPT_HASH: z.string().default("458d959c5cef1a5ce5152a9bc0e1ec7748d4c333232b20f8561b5250"),
  AGENT_WALLET_SCRIPT_HASH: z.string().default("c817e6ad2e47b3b46654e7c7bc6c1837bcff662aca3f61bd1809f8e9"),
  REPUTATION_POLICY_ID: z.string().default("1484440299a95dd439127458cb3ea1360157618547e6c5c042ed0975"),

  // Rate limits
  DEFAULT_RATE_LIMIT_RPM: z.string().default("60").transform(Number),
  TX_RATE_LIMIT_RPM: z.string().default("10").transform(Number),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof envSchema>;
