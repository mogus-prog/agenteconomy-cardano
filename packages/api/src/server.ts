import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";

import healthRoutes from "./routes/health.js";
import bountyRoutes from "./routes/bounties.js";
import walletRoutes from "./routes/wallets.js";
import agentRoutes from "./routes/agents.js";
import oracleRoutes from "./routes/oracle.js";
import webhookRoutes from "./routes/webhooks.js";
import errorHandlerPlugin from "./middleware/errorHandler.js";

import { startDeadlineMonitor } from "./workers/deadlineMonitor.js";
import { startClaimWindowEnforcer } from "./workers/claimWindowEnforcer.js";
import { startDisputeWindowChecker } from "./workers/disputeWindowChecker.js";
import { startBalanceRefresher } from "./workers/balanceRefresher.js";
import { startNotificationWorker } from "./workers/notificationWorker.js";

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  // Plugins
  await fastify.register(cors, { origin: true });

  // Error handler plugin
  await fastify.register(errorHandlerPlugin);

  // Routes — path prefixes are included in route definitions
  await fastify.register(healthRoutes);
  await fastify.register(bountyRoutes);
  await fastify.register(walletRoutes);
  await fastify.register(agentRoutes);
  await fastify.register(oracleRoutes);
  await fastify.register(webhookRoutes);

  return fastify;
}

async function main() {
  const server = await buildServer();

  // Start background workers
  if (config.NODE_ENV !== "test") {
    startDeadlineMonitor();
    startClaimWindowEnforcer();
    startDisputeWindowChecker();
    startBalanceRefresher();
    startNotificationWorker();
  }

  try {
    await server.listen({ port: config.PORT, host: config.HOST });
    console.log(`Server running on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

export { buildServer };
export default main;

// Run if this is the main module
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isMain) {
  main();
}
