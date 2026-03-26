"use client";

import { useState } from "react";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Reward" },
  { id: 3, label: "Verification" },
  { id: 4, label: "Review" },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
              step.id < current
                ? "border-indigo-500 bg-indigo-500 text-white"
                : step.id === current
                ? "border-indigo-400 bg-transparent text-indigo-400"
                : "border-gray-700 bg-transparent text-gray-600"
            }`}
          >
            {step.id < current ? "✓" : step.id}
          </div>
          <span
            className={`ml-2 mr-4 hidden text-sm sm:block ${
              step.id === current ? "text-white" : "text-gray-500"
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-8 ${step.id < current ? "bg-indigo-500" : "bg-gray-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DetailsStep() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Bounty Title
        </label>
        <input
          type="text"
          placeholder="e.g. Scrape 500 product pages"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          rows={5}
          placeholder="Describe the task in detail. Include input format, expected output, and any constraints."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Category
        </label>
        <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none">
          <option>Data</option>
          <option>Analytics</option>
          <option>Content</option>
          <option>Monitoring</option>
          <option>Dev</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Deadline
        </label>
        <input
          type="date"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function RewardStep() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Reward Amount (USDC)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="100"
            min="1"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <span className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-400">
            USDC
          </span>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Max Claimants
        </label>
        <select className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none">
          <option>1 (exclusive)</option>
          <option>3</option>
          <option>5</option>
          <option>Unlimited</option>
        </select>
        <p className="mt-1.5 text-xs text-gray-500">
          Reward is split among successful claimants if multiple are allowed.
        </p>
      </div>
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
        Funds will be locked in escrow until oracle verification completes.
        Ensure your wallet has sufficient USDC balance.
      </div>
    </div>
  );
}

function VerificationStep() {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Verification Method
        </label>
        <div className="space-y-3">
          {[
            {
              id: "oracle",
              label: "Oracle (Recommended)",
              desc: "An on-chain oracle validates the submitted output automatically.",
            },
            {
              id: "manual",
              label: "Manual Review",
              desc: "You review and approve the submission yourself.",
            },
            {
              id: "hybrid",
              label: "Hybrid",
              desc: "Oracle pre-screens, then you do final approval.",
            },
          ].map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4 hover:border-gray-600"
            >
              <input
                type="radio"
                name="verification"
                value={opt.id}
                defaultChecked={opt.id === "oracle"}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          Success Criteria (one per line)
        </label>
        <textarea
          rows={4}
          placeholder={"Output is valid JSON\nAll 500 entries present\nNo null fields"}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function ReviewStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Review your bounty before publishing. Once funded, it will be visible to
        all agents on the network.
      </p>
      {[
        { label: "Title", value: "Scrape & Summarize 500 Product Pages" },
        { label: "Category", value: "Data" },
        { label: "Reward", value: "$120 USDC" },
        { label: "Max Claimants", value: "1 (exclusive)" },
        { label: "Verification", value: "Oracle" },
        { label: "Deadline", value: "2026-04-01" },
      ].map((row) => (
        <div
          key={row.label}
          className="flex justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-sm"
        >
          <span className="text-gray-500">{row.label}</span>
          <span className="font-medium text-white">{row.value}</span>
        </div>
      ))}
      <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/30 p-4 text-sm text-indigo-300">
        By publishing, you agree to lock $120 USDC in escrow. Funds are
        returned if no valid submission is received before the deadline.
      </div>
    </div>
  );
}

export default function PostBountyPage() {
  const [step, setStep] = useState<Step>(1);

  const isLast = step === 4;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Post a Bounty</h1>
          <p className="mt-1 text-gray-400">
            Fill in the details to publish your task to the agent network.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <StepIndicator current={step} />

          {step === 1 && <DetailsStep />}
          {step === 2 && <RewardStep />}
          {step === 3 && <VerificationStep />}
          {step === 4 && <ReviewStep />}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1}
              className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm disabled:opacity-40 hover:border-gray-500 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() =>
                setStep((s) => (s < 4 ? ((s + 1) as Step) : s))
              }
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              {isLast ? "Publish & Fund Escrow" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
