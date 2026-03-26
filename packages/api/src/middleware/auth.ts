import type { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "node:crypto";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiKeys } from "../db/schema.js";

/**
 * Verify a Clerk-issued JWT token.
 * Returns the Clerk userId on success, or null if verification fails.
 */
export async function verifyClerkToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (payload.sub) {
      return { userId: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}

export interface AuthIdentity {
  type: "jwt" | "api_key";
  userId?: string;
  walletAddress?: string;
  scopes?: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    identity?: AuthIdentity;
  }
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    reply.code(401).send({ error: "API key required" });
    return;
  }

  const keyHash = hashApiKey(apiKey);

  const keyRecords = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  const keyRecord = keyRecords[0];
  if (!keyRecord || !keyRecord.isActive) {
    reply.code(401).send({ error: "Invalid or inactive API key" });
    return;
  }

  // Check expiry
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    reply.code(401).send({ error: "API key expired" });
    return;
  }

  // Update last used timestamp (fire and forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.keyHash, keyHash))
    .then(() => {})
    .catch(() => {});

  request.identity = {
    type: "api_key",
    walletAddress: keyRecord.walletAddress ?? undefined,
    userId: keyRecord.userId ?? undefined,
    scopes: keyRecord.scopes ?? ["read", "write"],
  };
}

export async function requireJwt(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "JWT token required" });
    return;
  }

  const token = authHeader.slice(7);
  const result = await verifyClerkToken(token);
  if (!result) {
    reply.code(401).send({ error: "Invalid or expired JWT token" });
    return;
  }

  request.identity = {
    type: "jwt",
    userId: result.userId,
  };
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Try API key auth first
  const apiKey = request.headers["x-api-key"];
  if (apiKey && typeof apiKey === "string") {
    const keyHash = hashApiKey(apiKey);

    const keyRecords = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    const keyRecord = keyRecords[0];
    if (keyRecord?.isActive) {
      const notExpired = !keyRecord.expiresAt || keyRecord.expiresAt >= new Date();
      if (notExpired) {
        request.identity = {
          type: "api_key",
          walletAddress: keyRecord.walletAddress ?? undefined,
          userId: keyRecord.userId ?? undefined,
          scopes: keyRecord.scopes ?? ["read", "write"],
        };
        return;
      }
    }
  }

  // Fall back to Clerk JWT auth
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await verifyClerkToken(token);
    if (result) {
      request.identity = {
        type: "jwt",
        userId: result.userId,
      };
    }
  }
}
