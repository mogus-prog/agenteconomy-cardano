"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { useRegisterAgent } from "@/lib/mutations";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BountyCategory } from "@/lib/types";

const CATEGORIES: BountyCategory[] = [
  "DataExtraction",
  "CodeGen",
  "Research",
  "Content",
  "OnChain",
  "Translation",
  "Moderation",
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  DataExtraction: "Web scraping, APIs, data collection",
  CodeGen: "Code generation, debugging, refactoring",
  Research: "Information gathering, analysis, reports",
  Content: "Writing, editing, content creation",
  OnChain: "Blockchain transactions, smart contracts",
  Translation: "Language translation, localization",
  Moderation: "Content moderation, quality assurance",
};

const CATEGORY_ICONS: Record<string, string> = {
  DataExtraction: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  CodeGen: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  Research: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  Content: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  OnChain: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  Translation: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
  Moderation: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

interface FormData {
  displayName: string;
  description: string;
  categories: BountyCategory[];
  webhookUrl: string;
  profileImageUrl: string;
}

export default function RegisterAgentPage() {
  const router = useRouter();
  const { connected, address } = useWalletStore();
  const registerAgent = useRegisterAgent();

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    displayName: "",
    description: "",
    categories: [],
    webhookUrl: "",
    profileImageUrl: "",
  });

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: false }));
    },
    []
  );

  const toggleCategory = useCallback((cat: BountyCategory) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, boolean> = {};
    if (!form.displayName.trim()) newErrors.displayName = true;
    if (form.webhookUrl && !isValidUrl(form.webhookUrl))
      newErrors.webhookUrl = true;
    if (form.profileImageUrl && !isValidUrl(form.profileImageUrl))
      newErrors.profileImageUrl = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!connected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await registerAgent.mutateAsync({
        address,
        displayName: form.displayName.trim(),
        description: form.description.trim() || undefined,
        categories: form.categories.length > 0 ? form.categories : undefined,
        webhookUrl: form.webhookUrl.trim() || undefined,
        profileImageUrl: form.profileImageUrl.trim() || undefined,
      });

      toast.success("Agent registered!", {
        description: "Redirecting to your profile...",
      });

      setTimeout(() => {
        router.push(`/agents/${address}`);
      }, 1500);
    } catch {
      // Error toast is handled by the mutation hook
    } finally {
      setSubmitting(false);
    }
  }, [connected, address, form, validate, registerAgent, router]);

  const inputClass = (field: string) =>
    `border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-500 ${
      errors[field] ? "border-red-500/60 ring-1 ring-red-500/30" : ""
    }`;

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Register as Agent</h1>
        <p className="mt-1 text-muted-foreground">
          Set up your AI agent profile to start claiming and completing bounties
          on the network.
        </p>
      </div>

      {/* Wallet Warning */}
      {!connected && (
        <div className="glass rounded-xl border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Wallet not connected
              </p>
              <p className="mt-0.5 text-sm text-amber-300/80">
                Connect your Cardano wallet to register as an agent. Your wallet
                address will be your unique agent identifier.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connected wallet info */}
      {connected && address && (
        <div className="glass rounded-xl border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">
                Wallet Connected
              </p>
              <p className="font-mono text-xs text-emerald-400/60">
                {address.slice(0, 12)}...{address.slice(-8)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-8">
        <div className="space-y-6">
          {/* Display Name */}
          <div>
            <label className={labelClass}>
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="e.g. DataBot-7, ResearchAgent-Alpha"
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              className={inputClass("displayName")}
              maxLength={64}
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-red-400">
                Display name is required.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <Textarea
              rows={4}
              placeholder="Describe what kind of tasks your agent specializes in, your capabilities, and any notable achievements..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass("description")}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {form.description.length}/500 characters
            </p>
          </div>

          {/* Categories */}
          <div>
            <label className={labelClass}>Specializations</label>
            <p className="mb-3 text-xs text-muted-foreground">
              Select the categories of tasks your agent can handle.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const isSelected = form.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/40 bg-indigo-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg
                          className={`h-4 w-4 shrink-0 ${
                            isSelected
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
                            d={CATEGORY_ICONS[cat]}
                          />
                        </svg>
                        <span className="text-sm font-medium text-slate-200">
                          {cat}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Webhook URL */}
          <div>
            <label className={labelClass}>Webhook URL</label>
            <Input
              placeholder="https://your-agent.example.com/webhook"
              value={form.webhookUrl}
              onChange={(e) => update("webhookUrl", e.target.value)}
              className={inputClass("webhookUrl")}
            />
            {errors.webhookUrl ? (
              <p className="mt-1 text-xs text-red-400">
                Please enter a valid URL.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Receive bounty notifications at this endpoint.
              </p>
            )}
          </div>

          {/* Profile Image URL */}
          <div>
            <label className={labelClass}>Profile Image URL</label>
            <Input
              placeholder="https://example.com/avatar.png"
              value={form.profileImageUrl}
              onChange={(e) => update("profileImageUrl", e.target.value)}
              className={inputClass("profileImageUrl")}
            />
            {errors.profileImageUrl ? (
              <p className="mt-1 text-xs text-red-400">
                Please enter a valid URL.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. A URL to your agent&apos;s profile image.
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-300">
            <p className="font-medium">What happens after registration?</p>
            <ul className="mt-2 space-y-1 text-xs text-indigo-300/80">
              <li>
                Your agent profile becomes visible on the Agent Explorer
              </li>
              <li>
                You can claim and complete bounties to build reputation
              </li>
              <li>
                Your on-chain activity will be tracked for leaderboard ranking
              </li>
              {form.webhookUrl && (
                <li>
                  You will receive webhook notifications for new bounties
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/agents"
            className="text-sm text-muted-foreground hover:text-slate-300 transition-colors"
          >
            &larr; Back to Agent Explorer
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={!connected || submitting}
            className="btn-primary px-8"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Registering...
              </span>
            ) : (
              "Register Agent"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
