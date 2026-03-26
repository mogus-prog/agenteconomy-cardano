interface BountyDetailPageProps {
  params: { id: string };
}

const BOUNTY_DATA: Record<
  string,
  {
    title: string;
    description: string;
    reward: number;
    deadline: string;
    status: string;
    category: string;
    poster: string;
    verificationCriteria: string[];
    claimants: number;
    createdAt: string;
  }
> = {
  "1": {
    title: "Scrape & Summarize 500 Product Pages",
    description:
      "Visit 500 e-commerce product URLs (provided in a CSV), extract title, price, rating, and review count, then generate a 2-sentence summary for each product. Deliver results as a structured JSON file with all fields populated.",
    reward: 120,
    deadline: "2026-04-01",
    status: "Open",
    category: "Data",
    poster: "0xA1b2...C3d4",
    verificationCriteria: [
      "Output JSON contains exactly 500 entries",
      "Each entry has title, price, rating, reviewCount, summary fields",
      "No empty or null fields",
      "JSON is valid and parseable",
    ],
    claimants: 3,
    createdAt: "2026-03-20",
  },
};

const FALLBACK_BOUNTY = {
  title: "Bounty Not Found",
  description: "This bounty does not exist or has been removed.",
  reward: 0,
  deadline: "N/A",
  status: "Unknown",
  category: "N/A",
  poster: "N/A",
  verificationCriteria: [],
  claimants: 0,
  createdAt: "N/A",
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-green-500/10 text-green-400 border-green-500/30",
  Claimed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Completed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  Unknown: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function BountyDetailPage({ params }: BountyDetailPageProps) {
  const bounty = BOUNTY_DATA[params.id] ?? FALLBACK_BOUNTY;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <a href="/bounties" className="hover:text-gray-300">
            Bounties
          </a>
          <span className="mx-2">/</span>
          <span>#{params.id}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
              {bounty.category}
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[bounty.status]}`}
            >
              {bounty.status}
            </span>
          </div>
          <h1 className="mb-4 text-2xl font-bold">{bounty.title}</h1>
          <p className="text-gray-400">{bounty.description}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Reward", value: `$${bounty.reward} USDC` },
            { label: "Deadline", value: bounty.deadline },
            { label: "Claimants", value: String(bounty.claimants) },
            { label: "Posted", value: bounty.createdAt },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-center"
            >
              <p className="text-lg font-bold text-indigo-400">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Poster */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-sm text-gray-500">
            Posted by{" "}
            <span className="font-mono text-gray-300">{bounty.poster}</span>
          </p>
        </div>

        {/* Verification Criteria */}
        {bounty.verificationCriteria.length > 0 && (
          <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Verification Criteria
            </h2>
            <ul className="space-y-2">
              {bounty.verificationCriteria.map((criterion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-center text-xs leading-4 text-indigo-400">
                    {i + 1}
                  </span>
                  <span className="text-gray-300">{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {bounty.status === "Open" && (
          <div className="flex gap-4">
            <button className="flex-1 rounded-lg bg-indigo-600 py-3 font-semibold hover:bg-indigo-500 transition-colors">
              Claim Bounty
            </button>
            <button className="rounded-lg border border-gray-700 px-6 py-3 text-sm hover:border-gray-500 transition-colors">
              Save
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
