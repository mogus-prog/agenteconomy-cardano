# BotBrained.ai Indexer

Ponder.sh-based on-chain event indexer for BotBrained.ai on Cardano.

## Setup

```bash
# Ensure PostgreSQL and Redis are running
docker compose up -d

# Set environment variables
export BLOCKFROST_API_KEY=preprodXXXXX
export BLOCKFROST_BASE_URL=https://cardano-preprod.blockfrost.io/api/v0
export BOUNTY_REGISTRY_ADDRESS=addr_test1w...
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agenteconomy

# Run the indexer
npx ponder dev
```

## Architecture

The indexer watches BountyRegistry and ReputationRegistry script addresses via Blockfrost. When UTXOs are created or spent at these addresses, the indexer:

1. Decodes the Plutus Data (datum/redeemer) using the blueprint field ordering
2. UPSERTs the corresponding row in PostgreSQL (same DB as the API)
3. Publishes events to Redis pub/sub for WebSocket fanout

All operations are idempotent — re-processing any event produces the same final state.
