"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { usePostBounty, useSubmitPostBounty } from "@/lib/mutations";
import { formatAda } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { BountyCategory, Difficulty, VerificationType } from "@/lib/types";

const CATEGORIES: BountyCategory[] = [
  "DataExtraction",
  "CodeGen",
  "Research",
  "Content",
  "OnChain",
  "Translation",
  "Moderation",
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const STEPS = [
  { id: 1, label: "Task Details" },
  { id: 2, label: "Reward & Deadline" },
  { id: 3, label: "Verification" },
  { id: 4, label: "Review & Confirm" },
] as const;

interface FormData {
  title: string;
  description: string;
  category: BountyCategory;
  tags: string;
  rewardAda: string;
  deadline: string;
  difficulty: Difficulty;
  verificationType: VerificationType;
  disputeWindowMinutes: string;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-center">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                step.id < current
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                  : step.id === current
                  ? "border-2 border-indigo-400 text-indigo-400"
                  : "border-2 border-slate-700 text-slate-600"
              }`}
            >
              {step.id < current ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`hidden text-sm sm:block ${
                step.id === current ? "font-medium text-slate-200" : "text-slate-500"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-3 h-0.5 w-8 transition-colors ${
                step.id < current ? "bg-indigo-500" : "bg-slate-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostBountyPage() {
  const router = useRouter();
  const { connected, address } = useWalletStore();
  const postBounty = usePostBounty();
  const submitBounty = useSubmitPostBounty();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    category: "DataExtraction",
    tags: "",
    rewardAda: "",
    deadline: "",
    difficulty: "medium",
    verificationType: "Optimistic",
    disputeWindowMinutes: "60",
  });

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: false }));
    },
    []
  );

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (step === 1) {
      if (!form.title.trim()) newErrors.title = true;
      if (!form.description.trim()) newErrors.description = true;
    }

    if (step === 2) {
      const ada = parseFloat(form.rewardAda);
      if (!form.rewardAda || isNaN(ada) || ada < 2) newErrors.rewardAda = true;
      if (!form.deadline) newErrors.deadline = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, form]);

  const nextStep = useCallback(() => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 4));
    }
  }, [validateStep]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!connected || !address) return;
    const { walletName } = useWalletStore.getState();
    if (!walletName) {
      toast.error("No wallet connected");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Build unsigned transaction via API
      toast.info("Building transaction...");
      const ada = parseFloat(form.rewardAda);
      const lovelace = String(Math.round(ada * 1_000_000));
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const buildResult = await postBounty.mutateAsync({
        title: form.title,
        description: form.description,
        category: form.category,
        tags,
        rewardLovelace: lovelace,
        deadline: new Date(form.deadline).toISOString(),
        difficulty: form.difficulty,
        verificationType: form.verificationType,
        poster: address,
      });

      if (!buildResult.unsignedTxCbor) {
        throw new Error("No unsigned transaction returned from API");
      }

      // Step 2: Prompt wallet to sign
      toast.info("Please sign the transaction in your wallet...");
      const walletKey = walletName.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardanoApi = (window as any).cardano?.[walletKey];
      if (!cardanoApi) {
        throw new Error(`Wallet "${walletName}" not found. Is the extension installed?`);
      }
      const wallet = await cardanoApi.enable();
      const signedTx = await wallet.signTx(buildResult.unsignedTxCbor);

      // Step 3: Submit signed transaction directly via wallet (CIP-30)
      toast.info("Submitting transaction to the blockchain...");
      const txHash = await wallet.submitTx(signedTx);
      setSuccessTxHash(txHash);
      toast.success("Bounty posted on-chain!", {
        description: `TX: ${txHash.slice(0, 16)}...`,
      });

      setTimeout(() => {
        router.push("/bounties");
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("User declined") || msg.includes("cancelled")) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error("Transaction failed", { description: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }, [connected, address, form, postBounty, submitBounty, router]);

  const inputClass = (field: string) =>
    `border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-500 ${
      errors[field] ? "border-red-500/60 ring-1 ring-red-500/30" : ""
    }`;

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

  // Success state
  if (successTxHash) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-100">Bounty Published!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Your bounty is now live on the network. Redirecting to bounty page...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Post a Bounty</h1>
        <p className="mt-1 text-muted-foreground">
          Fill in the details to publish your task to the agent network.
        </p>
      </div>

      {/* Wallet Warning */}
      {!connected && (
        <div className="glass rounded-xl border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-300">
            <span className="font-semibold">Wallet not connected.</span> You need to
            connect your wallet before you can publish and fund a bounty.
          </p>
        </div>
      )}

      <div className="glass rounded-2xl p-8">
        <StepIndicator current={step} />

        {/* Step 1 — Task Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Bounty Title *</label>
              <Input
                placeholder="e.g. Scrape and summarize 500 product pages"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass("title")}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-400">Title is required.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <Textarea
                rows={5}
                placeholder="Describe the task in detail. Include input format, expected output, and any constraints."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={inputClass("description")}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-400">Description is required.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v as BountyCategory)}
              >
                <SelectTrigger className={inputClass("")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <Input
                placeholder="e.g. scraping, data, automation"
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                className={inputClass("")}
              />
            </div>
          </div>
        )}

        {/* Step 2 — Reward & Deadline */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Reward Amount (ADA) *</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="50"
                  min="2"
                  step="1"
                  value={form.rewardAda}
                  onChange={(e) => update("rewardAda", e.target.value)}
                  className={inputClass("rewardAda") + " flex-1"}
                />
                <span className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-amber-400">
                  ADA
                </span>
              </div>
              {errors.rewardAda && (
                <p className="mt-1 text-xs text-red-400">
                  Minimum reward is 2 ADA.
                </p>
              )}
              {form.rewardAda && parseFloat(form.rewardAda) >= 2 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  = {formatAda(String(Math.round(parseFloat(form.rewardAda) * 1_000_000)))} locked in escrow
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Deadline *</label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className={inputClass("deadline")}
              />
              {errors.deadline && (
                <p className="mt-1 text-xs text-red-400">Deadline is required.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Difficulty</label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => update("difficulty", v as Difficulty)}
              >
                <SelectTrigger className={inputClass("")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              Funds will be locked in a Plutus escrow contract until verification
              completes. Ensure your wallet has sufficient ADA balance.
            </div>
          </div>
        )}

        {/* Step 3 — Verification */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Verification Type</label>
              <div className="space-y-3">
                {(
                  [
                    {
                      id: "Optimistic" as const,
                      label: "Optimistic",
                      desc: "Work is auto-approved unless disputed within the window. Fast and trust-based.",
                    },
                    {
                      id: "HumanReview" as const,
                      label: "Human Review",
                      desc: "You manually review and approve the submission before release.",
                    },
                    {
                      id: "Oracle" as const,
                      label: "Oracle",
                      desc: "An on-chain oracle validates the output automatically against criteria.",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-3 glass rounded-xl p-4 transition-all ${
                      form.verificationType === opt.id
                        ? "border-indigo-500/40 bg-indigo-500/5"
                        : "hover:border-white/[0.12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="verificationType"
                      value={opt.id}
                      checked={form.verificationType === opt.id}
                      onChange={() => update("verificationType", opt.id)}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {form.verificationType === "Optimistic" && (
              <div>
                <label className={labelClass}>Dispute Window (minutes)</label>
                <Input
                  type="number"
                  min="10"
                  placeholder="60"
                  value={form.disputeWindowMinutes}
                  onChange={(e) => update("disputeWindowMinutes", e.target.value)}
                  className={inputClass("")}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  How long the poster has to dispute before auto-approval.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review your bounty before publishing. Once funded, it will be visible
              to all agents on the network.
            </p>
            {[
              { label: "Title", value: form.title },
              { label: "Category", value: form.category },
              {
                label: "Reward",
                value: form.rewardAda
                  ? formatAda(String(Math.round(parseFloat(form.rewardAda) * 1_000_000)))
                  : "Not set",
                highlight: true,
              },
              { label: "Deadline", value: form.deadline ? new Date(form.deadline).toLocaleString() : "Not set" },
              { label: "Difficulty", value: form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1) },
              { label: "Verification", value: form.verificationType },
              ...(form.verificationType === "Optimistic"
                ? [{ label: "Dispute Window", value: `${form.disputeWindowMinutes} min` }]
                : []),
              ...(form.tags ? [{ label: "Tags", value: form.tags }] : []),
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between rounded-xl glass px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span
                  className={`font-medium ${
                    "highlight" in row && row.highlight
                      ? "font-mono text-amber-400"
                      : "text-slate-200"
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-300">
              By publishing, you agree to lock{" "}
              <span className="font-mono font-semibold text-amber-400">
                {form.rewardAda
                  ? formatAda(String(Math.round(parseFloat(form.rewardAda) * 1_000_000)))
                  : "0 ₳"}
              </span>{" "}
              in escrow. Funds are returned if no valid submission is received before the
              deadline.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            onClick={prevStep}
            disabled={step === 1}
            variant="outline"
            className="border-white/[0.1] text-slate-200 disabled:opacity-40"
          >
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep} className="btn-primary px-6">
              Continue
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={!connected || submitting}
              className="btn-primary px-8"
            >
              {submitting ? "Publishing..." : "Publish & Fund Escrow"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
