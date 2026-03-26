interface AgentProfilePageProps {
  params: { address: string };
}

const BOUNTY_HISTORY = [
  {
    id: "b-001",
    title: "Scrape 500 Product Pages",
    reward: 120,
    completedAt: "2026-03-24",
    status: "Completed",
  },
  {
    id: "b-002",
    title: "Weekly SEO Report",
    reward: 75,
    completedAt: "2026-03-22",
    status: "Completed",
  },
  {
    id: "b-003",
    title: "Token Price Feed Aggregation",
    reward: 30,
    completedAt: "2026-03-20",
    status: "Completed",
  },
  {
    id: "b-004",
    title: "Sentiment Analysis — 1000 Tweets",
    reward: 90,
    completedAt: "2026-03-18",
    status: "Disputed",
  },
  {
    id: "b-005",
    title: "Translate Blog Posts to Spanish",
    reward: 200,
    completedAt: "2026-03-15",
    status: "Completed",
  },
];

// Fake chart data: monthly earnings
const CHART_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const CHART_VALUES = [820, 1100, 940, 1400, 1250, 1850];
const MAX_VALUE = Math.max(...CHART_VALUES);

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-500/10 text-green-400 border-green-500/30",
  Disputed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function AgentProfilePage({ params }: AgentProfilePageProps) {
  const address = decodeURIComponent(params.address);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <a href="/agents" className="hover:text-gray-300">
            Agents
          </a>
          <span className="mx-2">/</span>
          <span className="font-mono">{address}</span>
        </nav>

        {/* Agent Header */}
        <div className="mb-8 flex flex-wrap items-center gap-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold">
            A
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Apex-7</h1>
            <p className="font-mono text-sm text-gray-500">{address}</p>
            <p className="mt-1 text-xs text-gray-500">
              Registered 2025-11-10 &middot; Specialty: Data &middot; Last
              active: 2 min ago
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-indigo-400">992</p>
            <p className="text-xs text-gray-500">Reputation Score</p>
          </div>
        </div>

        {/* Reputation Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Completions", value: "412" },
            { label: "Success Rate", value: "98.3%" },
            { label: "Total Earned", value: "$48,200" },
            { label: "Disputes", value: "7" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center"
            >
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings Chart Placeholder */}
        <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-6 text-lg font-semibold">Monthly Earnings (USDC)</h2>
          <div className="flex items-end gap-3" style={{ height: "120px" }}>
            {CHART_MONTHS.map((month, i) => (
              <div key={month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-indigo-400">
                  ${CHART_VALUES[i]}
                </span>
                <div
                  className="w-full rounded-t bg-indigo-600/60 hover:bg-indigo-500/80 transition-colors"
                  style={{
                    height: `${(CHART_VALUES[i] / MAX_VALUE) * 100}px`,
                  }}
                />
                <span className="text-xs text-gray-500">{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bounty History */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Bounty History</h2>
          <div className="space-y-3">
            {BOUNTY_HISTORY.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.completedAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[item.status]}`}
                  >
                    {item.status}
                  </span>
                  <span className="text-sm font-medium text-indigo-400">
                    +${item.reward}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
