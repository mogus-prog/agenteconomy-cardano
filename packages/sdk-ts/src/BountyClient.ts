// ─────────────────────────────────────────────────────────
// BountyClient — Agent-side bounty marketplace client
// ─────────────────────────────────────────────────────────

import type {
  Bounty,
  BountySpec,
  BountyFilter,
  ClaimResult,
  SubmitResult,
  AgentRank,
  EligibilityResult,
  EarningsPoint,
  Network,
} from "./types.js";
import type { AgentWallet } from "./AgentWallet.js";

export interface BountyClientConfig {
  wallet: AgentWallet;
  apiUrl?: string;
  network: Network;
}

export class BountyClient {
  private readonly wallet: AgentWallet;
  private readonly apiUrl: string;
  private readonly network: Network;

  constructor(config: BountyClientConfig) {
    this.wallet = config.wallet;
    this.apiUrl = config.apiUrl ?? "http://localhost:3000";
    this.network = config.network;
  }

  async discoverBounties(filter?: BountyFilter): Promise<Bounty[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.category) params.set("category", filter.category);
    if (filter?.difficulty) params.set("difficulty", filter.difficulty);
    if (filter?.minReward !== undefined)
      params.set("min_reward", filter.minReward.toString());
    if (filter?.maxReward !== undefined)
      params.set("max_reward", filter.maxReward.toString());
    if (filter?.search) params.set("search", filter.search);
    if (filter?.page) params.set("page", filter.page.toString());
    if (filter?.limit) params.set("limit", filter.limit.toString());
    if (filter?.sort) params.set("sort", filter.sort);

    const response = await fetch(
      `${this.apiUrl}/v1/bounties?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to discover bounties: ${response.status}`);
    }
    return (await response.json()) as Bounty[];
  }

  async getBounty(id: string): Promise<Bounty> {
    const response = await fetch(`${this.apiUrl}/v1/bounties/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to get bounty ${id}: ${response.status}`);
    }
    return (await response.json()) as Bounty;
  }

  async getBountySpec(id: string): Promise<BountySpec> {
    const response = await fetch(`${this.apiUrl}/v1/bounties/${id}/spec`);
    if (!response.ok) {
      throw new Error(`Failed to get bounty spec: ${response.status}`);
    }
    return (await response.json()) as BountySpec;
  }

  subscribeFeed(params: {
    filter?: BountyFilter;
    onBounty: (bounty: Bounty) => void;
  }): () => void {
    const filterParams = new URLSearchParams();
    if (params.filter?.category)
      filterParams.set("category", params.filter.category);
    if (params.filter?.minReward !== undefined)
      filterParams.set("min_reward", params.filter.minReward.toString());

    const wsUrl = this.apiUrl.replace(/^http/, "ws");
    const ws = new WebSocket(
      `${wsUrl}/v1/bounties/feed?${filterParams.toString()}`,
    );

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          bounty: Bounty;
        };
        if (data.type === "bounty:new") {
          params.onBounty(data.bounty);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }

  async claimBounty(bountyId: string): Promise<ClaimResult> {
    // Check eligibility first
    const eligibility = await this.checkEligibility(bountyId);
    if (!eligibility.eligible) {
      throw new Error(
        `Not eligible to claim bounty: ${eligibility.reason ?? "unknown"}`,
      );
    }

    const agentAddress = await this.wallet.getAddress();

    // Build claim tx
    const buildResponse = await fetch(
      `${this.apiUrl}/v1/bounties/${bountyId}/build-claim`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_address: agentAddress }),
      },
    );
    if (!buildResponse.ok) {
      throw new Error(`Failed to build claim tx: ${buildResponse.status}`);
    }
    const { unsignedTxCbor } = (await buildResponse.json()) as {
      unsignedTxCbor: string;
    };

    // Submit signed tx
    const submitResponse = await fetch(
      `${this.apiUrl}/v1/bounties/${bountyId}/submit-claim`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_tx_cbor: unsignedTxCbor }),
      },
    );
    if (!submitResponse.ok) {
      throw new Error(`Failed to submit claim tx: ${submitResponse.status}`);
    }
    const result = (await submitResponse.json()) as {
      tx_hash: string;
      claimed_at: number;
    };

    return {
      txHash: result.tx_hash,
      bountyId,
      claimedAt: result.claimed_at,
    };
  }

  async submitWork(
    bountyId: string,
    result: unknown,
  ): Promise<SubmitResult> {
    // Build submit work tx (API handles IPFS upload)
    const buildResponse = await fetch(
      `${this.apiUrl}/v1/bounties/${bountyId}/build-submit-work`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      },
    );
    if (!buildResponse.ok) {
      throw new Error(
        `Failed to build submit-work tx: ${buildResponse.status}`,
      );
    }
    const { unsignedTxCbor, ipfsCid } = (await buildResponse.json()) as {
      unsignedTxCbor: string;
      ipfsCid: string;
    };

    // Submit signed tx
    const submitResponse = await fetch(
      `${this.apiUrl}/v1/bounties/${bountyId}/submit-work`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_tx_cbor: unsignedTxCbor }),
      },
    );
    if (!submitResponse.ok) {
      throw new Error(
        `Failed to submit work tx: ${submitResponse.status}`,
      );
    }
    const submitResult = (await submitResponse.json()) as {
      tx_hash: string;
      submitted_at: number;
    };

    return {
      txHash: submitResult.tx_hash,
      bountyId,
      ipfsCid,
      submittedAt: submitResult.submitted_at,
    };
  }

  async getActiveBounties(): Promise<Bounty[]> {
    const agentAddress = await this.wallet.getAddress();
    return this.discoverBounties({
      status: "Claimed",
    });
  }

  async postBounty(spec: BountySpec & {
    category: string;
    difficulty: string;
    rewardLovelace: bigint;
    deadline: number;
    verification: { type: string; disputeWindowMs?: number };
  }): Promise<string> {
    const buildResponse = await fetch(
      `${this.apiUrl}/v1/bounties/build-post`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...spec,
          rewardLovelace: spec.rewardLovelace.toString(),
        }),
      },
    );
    if (!buildResponse.ok) {
      throw new Error(`Failed to build post tx: ${buildResponse.status}`);
    }
    const { unsignedTxCbor } = (await buildResponse.json()) as {
      unsignedTxCbor: string;
    };

    const submitResponse = await fetch(
      `${this.apiUrl}/v1/bounties/submit-post`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_tx_cbor: unsignedTxCbor }),
      },
    );
    if (!submitResponse.ok) {
      throw new Error(`Failed to submit post tx: ${submitResponse.status}`);
    }
    const { utxoRef } = (await submitResponse.json()) as { utxoRef: string };
    return utxoRef;
  }

  async verifyAndPay(bountyId: string): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/v1/bounties/${bountyId}/verify-and-pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to verify and pay: ${response.status}`);
    }
    const { txHash } = (await response.json()) as { txHash: string };
    return txHash;
  }

  async getLeaderboard(params?: {
    category?: string;
    limit?: number;
  }): Promise<AgentRank[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set("category", params.category);
    if (params?.limit) queryParams.set("limit", params.limit.toString());

    const response = await fetch(
      `${this.apiUrl}/v1/agents/leaderboard?${queryParams.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }
    return (await response.json()) as AgentRank[];
  }

  async checkEligibility(bountyId: string): Promise<EligibilityResult> {
    try {
      const bounty = await this.getBounty(bountyId);
      const balance = await this.wallet.getBalance();
      const agentAddress = await this.wallet.getAddress();

      const hasFunds =
        balance.lovelace >= (bounty.depositLovelace + 2_000_000n);

      const meetsWhitelist =
        bounty.allowedAgents === null ||
        bounty.allowedAgents.includes(agentAddress);

      // Reputation check would require on-chain query
      const meetsReputation = true;

      const eligible = hasFunds && meetsWhitelist && meetsReputation;
      let reason: string | undefined;
      if (!hasFunds) reason = "Insufficient funds for bond deposit";
      else if (!meetsWhitelist) reason = "Agent not in allowed list";

      return {
        eligible,
        reason,
        meetsReputationRequirement: meetsReputation,
        meetsWhitelistRequirement: meetsWhitelist,
        hasSufficientFunds: hasFunds,
      };
    } catch (error) {
      return {
        eligible: false,
        reason: `Eligibility check failed: ${error instanceof Error ? error.message : "unknown error"}`,
        meetsReputationRequirement: false,
        meetsWhitelistRequirement: false,
        hasSufficientFunds: false,
      };
    }
  }

  async getEarningsHistory(params: {
    period: "day" | "week" | "month";
  }): Promise<EarningsPoint[]> {
    const agentAddress = await this.wallet.getAddress();
    const response = await fetch(
      `${this.apiUrl}/v1/agents/${agentAddress}/earnings?period=${params.period}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch earnings: ${response.status}`);
    }
    return (await response.json()) as EarningsPoint[];
  }
}
