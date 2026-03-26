# BotBrained.ai on Cardano — Master Context

## What We're Building
Two integrated platforms on Cardano blockchain:
1. AgentWallet — programmable spending policy wallet SDK for AI agents
2. AgentBounty — on-chain task marketplace where agents earn ADA

## Full Specification
The complete specification is at: docs/AgentEconomy_Cardano_Complete_Spec.html
Read that file at the start of every session. It contains all datum schemas,
redeemer types, API endpoint lists, database schema, and feature tables.

## Monorepo Structure
packages/
  contracts/   → Aiken smart contracts (PlutusV3)
  sdk-ts/      → TypeScript SDK (@agenteconomy/sdk on npm)
  sdk-python/  → Python SDK (agenteconomy on PyPI)
  api/         → Fastify REST + WebSocket API
  indexer/     → Ponder.sh on-chain event indexer
  dashboard/   → Next.js 14 frontend

## Tech Stack (Non-Negotiable)
- Smart contracts:    Aiken (NOT Haskell Plutus)
- Off-chain TS:       MeshJS (@meshsdk/core + @meshsdk/wallet)
- Off-chain Python:   PyCardano (pycardano)
- Blockchain API:     Blockfrost (Preprod testnet)
- Database:           PostgreSQL 16 via Drizzle ORM (Supabase hosted)
- Cache & Queues:     Redis 7 (Upstash)
- IPFS (primary):     web3.storage
- IPFS (backup pin):  Pinata
- API framework:      Fastify (Node.js 20) + Zod validation
- Frontend:           Next.js 14 App Router + Tailwind + shadcn/ui
- Auth (humans):      Clerk.dev
- Monitoring:         Sentry + Prometheus/Grafana

## Cardano Network
- All development on Cardano Preprod testnet
- Blockfrost URL: https://cardano-preprod.blockfrost.io/api/v0
- Never hardcode API keys — always process.env.BLOCKFROST_API_KEY

## Core Cardano Concepts (Apply Correctly)
- EUTXO: txs consume inputs, produce outputs — no global mutable state
- MinUTXO: every output needs ~2 ADA minimum (use calculateMinLovelace)
- Inline datums: always use inline datums for PlutusV3 scripts
- Collateral: required when spending any Plutus script UTXO
- Redeemers: Plutus Data encoded as constr(index, [fields])
- Validity interval: use lower_bound/upper_bound for all time checks

## Critical Security Rule
The API server NEVER holds, stores, or uses any private key.
It only builds unsigned transaction CBOR. All signing is done by the
agent SDK on the agent's own machine.

## Script Addresses (from aiken build)
BOUNTY_REGISTRY_SCRIPT_HASH=458d959c5cef1a5ce5152a9bc0e1ec7748d4c333232b20f8561b5250
AGENT_WALLET_SCRIPT_HASH=c817e6ad2e47b3b46654e7c7bc6c1837bcff662aca3f61bd1809f8e9
REPUTATION_POLICY_ID=1484440299a95dd439127458cb3ea1360157618547e6c5c042ed0975

## Definition of Done Per Package
- contracts:   aiken check passes, aiken build produces plutus.json
- sdk-ts:      npm run build clean, npm test 100% pass
- sdk-python:  pytest 100% pass, pip install -e . works
- api:         npm test 100% pass, all endpoints return correct status codes
- indexer:     syncs Preprod events, upserts are idempotent
- dashboard:   builds clean, all 13 pages render, wallet connect works
