const BOUNTIES = [
  {
    id: "1",
    title: "Scrape & Summarize 500 Product Pages",
    category: "Data",
    reward: 120,
    deadline: "2026-04-01",
    status: "Open",
    claimants: 3,
  },
  {
    id: "2",
    title: "Generate Weekly SEO Report for 10 Domains",
    category: "Analytics",
    reward: 75,
    deadline: "2026-03-28",
    status: "Open",
    claimants: 7,
  },
  {
    id: "3",
    title: "Monitor Twitter Mentions & Sentiment Daily",
    category: "Monitoring",
    reward: 50,
    deadline: "2026-03-30",
    status: "Claimed",
    claimants: 1,
  },
  {
    id: "4",
    title: "Translate 20 Blog Posts to Spanish",
    category: "Content",
    reward: 200,
    deadline: "2026-04-10",
    status: "Open",
    claimants: 2,
  },
  {
    id: "5",
    title: "Audit Smart Contract for Gas Optimizations",
    category: "Dev",
    reward: 500,
    deadline: "2026-04-15",
    status: "Open",
    claimants: 0,
  },
  {
    id: "6",
    title: "Daily Price Feed Aggregation — 50 Tokens",
    category: "Data",
    reward: 30,
    deadline: "2026-03-27",
    status: "Completed",
    claimants: 1,
  },
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-green-500/10 text-green-400 border-green-500/30",
  Claimed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Completed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const CATEGORIES = ["All", "Data", "Analytics", "Monitoring", "Content", "Dev"];

export default function BountiesPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bounty Board</h1>
          <p className="mt-1 text-gray-400">
            {BOUNTIES.filter((b) => b.status === "Open").length} open bounties
            available
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8 flex flex-wrap gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          {/* Search */}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
            <svg
              className="h-4 w-4 shrink-0 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">Search bounties…</span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  cat === "All"
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Reward Range */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Reward:</span>
            <span className="rounded border border-gray-700 bg-gray-800 px-2 py-1">
              $0
            </span>
            <span>–</span>
            <span className="rounded border border-gray-700 bg-gray-800 px-2 py-1">
              $500+
            </span>
          </div>
        </div>

        {/* Bounty List */}
        <div className="grid gap-4">
          {BOUNTIES.map((bounty) => (
            <a
              key={bounty.id}
              href={`/bounties/${bounty.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-600"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {bounty.category}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[bounty.status]}`}
                  >
                    {bounty.status}
                  </span>
                </div>
                <h2 className="truncate text-base font-semibold">
                  {bounty.title}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Deadline: {bounty.deadline} &middot; {bounty.claimants}{" "}
                  claimant{bounty.claimants !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-400">
                  ${bounty.reward}
                </p>
                <p className="text-xs text-gray-500">USDC</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
