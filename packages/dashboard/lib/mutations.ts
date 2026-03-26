"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  buildPostBounty,
  submitPostBounty,
  buildClaimBounty,
  submitClaimBounty,
  buildSubmitWork,
  submitWork,
  buildApprovePay,
  submitApprovePay,
  buildDispute,
  submitDispute,
  registerAgent,
  buildSend,
  submitSend,
} from "@/lib/api";

export function usePostBounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      rewardLovelace: string;
      deadline: string;
      difficulty: string;
      verificationType: string;
      poster: string;
    }) => {
      // Map frontend form values to API schema
      const verificationMap: Record<string, string> = {
        Optimistic: "auto",
        HumanReview: "manual",
        OracleSigned: "oracle",
      };
      return buildPostBounty({
        title: params.title,
        descriptionIpfs: params.description, // API accepts raw text here, indexer handles IPFS
        category: params.category.toLowerCase(),
        tags: params.tags,
        rewardLovelace: params.rewardLovelace,
        deadline: params.deadline,
        difficulty: params.difficulty.toLowerCase(),
        verificationType: verificationMap[params.verificationType] ?? params.verificationType.toLowerCase(),
        posterAddress: params.poster,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to build bounty transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitPostBounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { signedTx: string; posterAddress: string }) => submitPostBounty(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
      toast.success("Bounty posted successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to submit bounty", { description: err.message });
    },
  });
}

export function useClaimBounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      agent,
    }: {
      bountyId: string;
      agent: string;
    }) => buildClaimBounty(bountyId, { agent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to build claim transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitClaimBounty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      signedTxCbor,
    }: {
      bountyId: string;
      signedTxCbor: string;
    }) => submitClaimBounty(bountyId, { signedTxCbor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      toast.success("Bounty claimed successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to submit claim", { description: err.message });
    },
  });
}

export function useSubmitWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      agent,
      resultIpfs,
    }: {
      bountyId: string;
      agent: string;
      resultIpfs: string;
    }) => buildSubmitWork(bountyId, { agent, resultIpfs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to build submit-work transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitWorkTx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      signedTxCbor,
    }: {
      bountyId: string;
      signedTxCbor: string;
    }) => submitWork(bountyId, { signedTxCbor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      toast.success("Work submitted successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to submit work", { description: err.message });
    },
  });
}

export function useApprovePay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      poster,
    }: {
      bountyId: string;
      poster: string;
    }) => buildApprovePay(bountyId, { poster }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to build approve transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitApprovePay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      signedTxCbor,
    }: {
      bountyId: string;
      signedTxCbor: string;
    }) => submitApprovePay(bountyId, { signedTxCbor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
      toast.success("Bounty approved and paid");
    },
    onError: (err: Error) => {
      toast.error("Failed to submit approval", { description: err.message });
    },
  });
}

export function useBuildDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      poster,
      reason,
    }: {
      bountyId: string;
      poster: string;
      reason: string;
    }) => buildDispute(bountyId, { poster, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["bountyStats"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to build dispute transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bountyId,
      signedTxCbor,
    }: {
      bountyId: string;
      signedTxCbor: string;
    }) => submitDispute(bountyId, { signedTxCbor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bounties"] });
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute filed successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to submit dispute", { description: err.message });
    },
  });
}

export function useRegisterAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      address: string;
      displayName?: string;
      description?: string;
      categories?: string[];
      webhookUrl?: string;
      profileImageUrl?: string;
    }) => registerAgent(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agentLeaderboard"] });
      toast.success("Agent registered successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to register agent", { description: err.message });
    },
  });
}

export function useSendFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      address,
      toAddress,
      amountLovelace,
    }: {
      address: string;
      toAddress: string;
      amountLovelace: string;
    }) => buildSend(address, { toAddress, amountLovelace }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["walletBalance", variables.address],
      });
      qc.invalidateQueries({
        queryKey: ["walletTransactions", variables.address],
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to build send transaction", {
        description: err.message,
      });
    },
  });
}

export function useSubmitSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      address,
      signedTxCbor,
    }: {
      address: string;
      signedTxCbor: string;
    }) => submitSend(address, { signedTxCbor }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["walletBalance", variables.address],
      });
      qc.invalidateQueries({
        queryKey: ["walletTransactions", variables.address],
      });
      toast.success("Funds sent successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to send funds", { description: err.message });
    },
  });
}
