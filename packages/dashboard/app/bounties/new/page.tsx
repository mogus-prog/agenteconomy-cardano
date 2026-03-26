"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { usePostBounty, useSubmitPostBounty } from "@/lib/mutations";
import { formatAda } from "@/lib/utils";
import { assembleSignedTx, enableWallet } from "@/lib/tx-utils";
import { config } from "@/lib/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BountyCategory, Difficulty, VerificationType } from "@/lib/types";
import { BOUNTY_TEMPLATES, type BountyTemplate, type ResultSchema } from "@/lib/bounty-templates";

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

const RECURRING_INTERVALS = [
  { label: "Every hour", value: "3600000" },
  { label: "Every 6 hours", value: "21600000" },
  { label: "Daily", value: "86400000" },
  { label: "Weekly", value: "604800000" },
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
  resultSchema: ResultSchema | null;
  isRecurring: boolean;
  recurringIntervalMs: string;
  maxRecurrences: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  DataExtraction: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  CodeGen: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  Research: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Content: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  OnChain: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  Translation: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
  Moderation: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

function TemplateSelector({
  onSelect,
  selectedTemplateId,
}: {
  onSelect: (template: BountyTemplate | null) => void;
  selectedTemplateId: string | null;
}) {
  return (
    <div className="mb-6">
      <label className="mb-3 block text-sm font-medium text-slate-300">
        Start from a template
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BOUNTY_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() =>
              onSelect(selectedTemplateId === template.id ? null : template)
            }
            className={`group glass rounded-xl p-4 text-left transition-all ${
              selectedTemplateId === template.id
                ? "border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                : "hover:border-white/[0.12] hover:bg-white/[0.02]"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <svg
                className={`h-4 w-4 shrink-0 ${
                  selectedTemplateId === template.id
                    ? "text-indigo-400"
                    : "text-slate-500 group-hover:text-slate-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={CATEGORY_ICONS[template.category] ?? CATEGORY_ICONS.CodeGen}
                />
              </svg>
              <span className="text-sm font-medium text-slate-200">
                {template.name}
              </span>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              {template.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]"
              >
                {template.category}
              </Badge>
              <span className="font-mono text-xs text-amber-400">
                ~{template.suggestedReward} ADA
              </span>
            </div>
          </button>
        ))}
      </div>
      {selectedTemplateId && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-3 text-xs text-slate-400 hover:text-slate-300 underline underline-offset-2"
        >
          Clear template and start from scratch
        </button>
      )}
    </div>
  );
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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
    resultSchema: null,
    isRecurring: false,
    recurringIntervalMs: "86400000",
    maxRecurrences: "",
  });

  const applyTemplate = useCallback((template: BountyTemplate | null) => {
    if (!template) {
      setSelectedTemplateId(null);
      setForm({
        title: "",
        description: "",
        category: "DataExtraction",
        tags: "",
        rewardAda: "",
        deadline: "",
        difficulty: "medium",
        verificationType: "Optimistic",
        disputeWindowMinutes: "60",
        resultSchema: null,
        isRecurring: false,
        recurringIntervalMs: "86400000",
        maxRecurrences: "",
      });
      setErrors({});
      return;
    }
    setSelectedTemplateId(template.id);
    setForm((prev) => ({
      ...prev,
      title: template.name,
      description: template.descriptionTemplate,
      category: template.category,
      tags: template.tags.join(", "),
      rewardAda: String(template.suggestedReward),
      difficulty: template.difficulty,
      resultSchema: template.resultSchema,
    }));
    setErrors({});
  }, []);

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
      const wallet = await enableWallet(walletName);
      const witnessSet = await wallet.signTx(buildResult.unsignedTxCbor);

      // Step 3: Assemble signed tx (merge witness set into unsigned tx) and submit
      toast.info("Submitting transaction to the blockchain...");
      const assembledTx = assembleSignedTx(buildResult.unsignedTxCbor, witnessSet);
      const txHash = await wallet.submitTx(assembledTx);

      // Step 4: Record bounty in database (fire-and-forget, don't block on failure)
      try {
        await fetch(`${config.apiUrl}/v1/bounties/record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash,
            title: form.title,
            description: form.description,
            category: form.category,
            tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
            rewardLovelace: String(Math.round(parseFloat(form.rewardAda) * 1_000_000)),
            deadline: new Date(form.deadline).toISOString(),
            difficulty: form.difficulty.toLowerCase(),
            verificationType: form.verificationType,
            posterAddress: address,
            ...(form.resultSchema ? { resultSchema: form.resultSchema } : {}),
            ...(form.isRecurring
              ? {
                  isRecurring: true,
                  recurringIntervalMs: form.recurringIntervalMs,
                  ...(form.maxRecurrences ? { maxRecurrences: parseInt(form.maxRecurrences) } : {}),
                }
              : {}),
          }),
        });
      } catch {
        // Non-critical — indexer will pick it up from chain eventually
      }

      setSuccessTxHash(txHash);
      toast.success("Bounty posted on-chain!", {
        description: `TX: ${txHash.slice(0, 16)}...`,
      });

      // Invalidate bounty queries so the board refreshes
      postBounty.reset();

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
            <TemplateSelector
              onSelect={applyTemplate}
              selectedTemplateId={selectedTemplateId}
            />
            <div className="h-px bg-white/[0.06]" />
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
            {/* Recurring bounty toggle */}
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => update("isRecurring", e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-200">
                    Recurring bounty
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Automatically repost this bounty after completion
                  </p>
                </div>
              </label>

              {form.isRecurring && (
                <div className="ml-7 space-y-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <div>
                    <label className={labelClass}>Repeat Interval</label>
                    <Select
                      value={form.recurringIntervalMs}
                      onValueChange={(v) => update("recurringIntervalMs", v)}
                    >
                      <SelectTrigger className={inputClass("")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.1] bg-[#0a1628] text-slate-200">
                        {RECURRING_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={interval.value}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Max Recurrences{" "}
                      <span className="font-normal text-muted-foreground">
                        (leave blank for unlimited)
                      </span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={form.maxRecurrences}
                      onChange={(e) => update("maxRecurrences", e.target.value)}
                      className={inputClass("")}
                    />
                  </div>
                </div>
              )}
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
              ...(form.isRecurring
                ? [
                    {
                      label: "Recurring",
                      value: `${RECURRING_INTERVALS.find((i) => i.value === form.recurringIntervalMs)?.label ?? "Daily"}${
                        form.maxRecurrences ? ` (max ${form.maxRecurrences})` : " (unlimited)"
                      }`,
                    },
                  ]
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

            {form.resultSchema && (
              <div className="glass rounded-xl p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Expected Result Schema
                </h4>
                <div className="space-y-1.5">
                  {Object.entries(form.resultSchema.properties).map(
                    ([field, prop]) => (
                      <div
                        key={field}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span
                          className={`font-mono font-medium ${
                            form.resultSchema!.required.includes(field)
                              ? "text-indigo-400"
                              : "text-slate-400"
                          }`}
                        >
                          {field}
                          {form.resultSchema!.required.includes(field) && (
                            <span className="text-red-400">*</span>
                          )}
                        </span>
                        <span className="text-slate-600">:</span>
                        <span className="text-slate-500">{prop.type}</span>
                        <span className="text-muted-foreground">
                          &mdash; {prop.description}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

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

