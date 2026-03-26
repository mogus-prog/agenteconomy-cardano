const MY_BOUNTIES = [
  {
    id: "1",
    title: "Scrape & Summarize 500 Product Pages",
    status: "Active",
    reward: 120,
    claimants: 3,
    deadline: "2026-04-01",
    spent: 0,
  },
  {
    id: "2",
    title: "Weekly SEO Report for 10 Domains",
    status: "Completed",
    reward: 75,
    claimants: 1,
    deadline: "2026-03-22",
    spent: 75,
  },
  {
    id: "3",
    title: "Translate 20 Blog Posts to Spanish",
    status: "Active",
    reward: 200,
    claimants: 2,
    deadline: "2026-04-10",
    spent: 0,
  },
  {
    id: "4",
    title: "Audit Smart Contract for Gas Optimizations",
    status: "Draft",
    reward: 500,
    claimants: 0,
    deadline: "2026-04-15",
    spent: 0,
  },
  {
    id: "5",
    title: "Daily Price Feed — 50 Tokens",
    status: "Completed",
    reward: 30,
    claimants: 1,
    deadline: "2026-03-20",
    spent: 30,
  },
];

// Spending chart: last 6 months
const SPENDING_DATA = [
  { month: "Oct", amount: 310 },
  { month: "Nov", amount: 520 },
  { month: "Dec", amount: 410 },
  { month: "Jan", amount: 680 },
  { month: "Feb", amount: 490 },
  { month: "Mar", amount: 425 },
];
const MAX_SPEND = Math.max(...SPENDING_DATA.map((d) => d.amount));

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500/10 text-green-400 border-green-500/30",
  Completed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  Draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

const totalSpent = MY_BOUNTIES.reduce((s, b) => s + b.spent, 0);
const activeCount = MY_BOUNTIES.filter((b) => b.status === "Active").length;
const completedCount = MY_BOUNTIES.filter((b) => b.status === "Completed").length;

export default function PosterDashboardPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="mt-1 text-gray-400">
              Manage your bounties and track spending
            </p>
          </div>
          <a
            href="/bounties/new"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            + Post Bounty
          </a>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Bounties", value: String(MY_BOUNTIES.length) },
            { label: "Active", value: String(activeCount) },
            { label: "Completed", value: String(completedCount) },
            { label: "Total Spent", value: `$${totalSpent} USDC` },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center"
            >
              <p className="text-xl font-bold text-indigo-400">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* My Bounties List */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 text-lg font-semibold">My Bounties</h2>
            <div className="space-y-3">
              {MY_BOUNTIES.map((bounty) => (
                <a
                  key={bounty.id}
                  href={`/bounties/${bounty.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-4 hover:border-gray-600 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="mb-1">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[bounty.status]}`}
                      >
                        {bounty.status}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">{bounty.title}</p>
                    <p className="text-xs text-gray-500">
                      Deadline: {bounty.deadline} &middot; {bounty.claimants}{" "}
                      claimant{bounty.claimants !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-indigo-400">${bounty.reward}</p>
                    <p className="text-xs text-gray-500">USDC</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Spending Analytics */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Spending (USDC)</h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-end gap-2" style={{ height: "120px" }}>
                {SPENDING_DATA.map((d) => (
                  <div
                    key={d.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t bg-indigo-600/60 hover:bg-indigo-500/80 transition-colors"
                      style={{
                        height: `${(d.amount / MAX_SPEND) * 100}px`,
                      }}
                    />
                    <span className="text-xs text-gray-500">{d.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-gray-800 pt-4 text-sm">
                <span className="text-gray-500">6-month total</span>
                <span className="font-bold text-white">
                  ${SPENDING_DATA.reduce((s, d) => s + d.amount, 0).toLocaleString()} USDC
                </span>
              </div>
            </div>

            {/* Quick Nav */}
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/active", label: "Active Bounties" },
                { href: "/dashboard/wallet", label: "Wallet & Balance" },
                { href: "/disputes", label: "Disputes" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-sm hover:border-gray-600 transition-colors"
                >
                  <span>{link.label}</span>
                  <span className="text-gray-600">&rarr;</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
