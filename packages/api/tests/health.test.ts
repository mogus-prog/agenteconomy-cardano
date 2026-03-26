import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock Redis before any imports that use it
vi.mock("ioredis", () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue("PONG"),
    lpush: vi.fn().mockResolvedValue(1),
    brpop: vi.fn().mockResolvedValue(null),
    pipeline: vi.fn().mockReturnValue({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 0], [null, 0], [null, 1], [null, 1]]),
    }),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    duplicate: vi.fn().mockReturnValue({
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    }),
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    status: "ready",
  }));
  return { Redis: RedisMock, default: RedisMock };
});

// Mock the database module
vi.mock("../src/db/index.js", () => {
  const emptyResult: never[] = [];
  const mockChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    const self = (): Record<string, unknown> => chain;
    for (const method of [
      "from", "where", "orderBy", "groupBy", "limit", "offset",
      "leftJoin", "innerJoin", "having",
    ]) {
      chain[method] = vi.fn().mockImplementation(self);
    }
    // Terminal: when awaited, resolve to empty array
    chain.then = (resolve: (v: never[]) => void) => {
      resolve(emptyResult);
      return chain;
    };
    return chain;
  };

  const mockSelect = vi.fn().mockImplementation(() => mockChain());

  return {
    db: {
      select: mockSelect,
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "00000000-0000-0000-0000-000000000000" }]),
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    },
  };
});

// Mock blockfrost service
vi.mock("../src/services/blockfrost.js", () => ({
  getAddressUtxos: vi.fn().mockResolvedValue([]),
  getTxInfo: vi.fn().mockResolvedValue(null),
  submitTx: vi.fn().mockResolvedValue("mock_tx_hash"),
  getProtocolParams: vi.fn().mockResolvedValue({}),
  getAddressTransactions: vi.fn().mockResolvedValue([]),
}));

// Mock IPFS service
vi.mock("../src/services/ipfs.js", () => ({
  uploadToIPFS: vi.fn().mockResolvedValue("bafymockcidhash"),
  fetchFromIPFS: vi.fn().mockResolvedValue({}),
}));

import { buildServer } from "../src/server.js";

describe("Health endpoints", () => {
  it("GET /health returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    await server.close();
  });
});

describe("Bounty endpoints", () => {
  it("GET /v1/bounties returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({ method: "GET", url: "/v1/bounties" });
    expect(response.statusCode).toBe(200);
    await server.close();
  });

  it("GET /v1/bounties/stats returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({ method: "GET", url: "/v1/bounties/stats" });
    expect(response.statusCode).toBe(200);
    await server.close();
  });

  it("GET /v1/bounties/:id returns response", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/v1/bounties/00000000-0000-0000-0000-000000000000",
    });
    expect([200, 404]).toContain(response.statusCode);
    await server.close();
  });
});

describe("Wallet endpoints", () => {
  it("GET /v1/wallets/:address returns response", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/v1/wallets/addr1_unknown",
    });
    expect([200, 404]).toContain(response.statusCode);
    await server.close();
  });
});

describe("Agent endpoints", () => {
  it("GET /v1/agents returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({ method: "GET", url: "/v1/agents" });
    expect(response.statusCode).toBe(200);
    await server.close();
  });

  it("GET /v1/agents/leaderboard returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/v1/agents/leaderboard",
    });
    expect(response.statusCode).toBe(200);
    await server.close();
  });
});

describe("Oracle endpoints", () => {
  it("GET /v1/disputes returns 200", async () => {
    const server = await buildServer();
    const response = await server.inject({ method: "GET", url: "/v1/disputes" });
    expect(response.statusCode).toBe(200);
    await server.close();
  });
});

describe("404 handler", () => {
  it("returns 404 for unknown routes", async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/v1/nonexistent",
    });
    expect(response.statusCode).toBe(404);
    await server.close();
  });
});
