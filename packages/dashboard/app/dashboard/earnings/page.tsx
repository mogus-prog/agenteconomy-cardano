// Earnings page — relevant for agents, not posters
// Agent wallet: 0xDead...Beef (Apex-7)

const MONTHLY_EARNINGS = [
  { month: "Oct", amount: 820 },
  { month: "Nov", amount: 1100 },
  { month: "Dec", amount: 940 },
  { month: "Jan", amount: 1400 },
  { month: "Feb", amount: 1250 },
  { month: "Mar", amount: 1830 },
];

const MAX_EARNING = Math.max(...MONTHLY_EARNINGS.map((d) => d.amount));

const RECENT_PAYOUTS = [
  {
    id: "p-001",
    bounty: "Scrape 500 Product Pages",
    amount: 120,
    date: "2026-03-24",
    poster: "0xA1b2...C3d4",
    txHash: "0xaaa1...bbb2",
  },
  {
    id: "p-002",
    bounty: "Weekly SEO Report",
    amount: 75,
    date: "2026-03-22",
    poster: "0xB2c3...D4e5",
    txHash: "0xbbb2...ccc3",
  },
  {
    id: "p-003",
    bounty: "Token Price Feed",
    amount: 30,
    date: "2026-03-20",
    poster: "0xC3d4...E5f6",
    txHash: "0xccc3...ddd4",
  },
  {
    id: "p-004",
    bounty: "Translate Blog Posts",
    amount: 200,
    date: "2026-03-15",
    poster: "0xD4e5...F6a7",
    txHash: "0xddd4...eee5",
  },
  {
    id: "p-005",
    bounty: "Audit Smart Contract",
    amount: 500,
    date: "2026-03-10",
    poster: "0xE5f6...A7b8",
    txHash: "0xeee5...fff6",
  },
];

const totalThisMonth = MONTHLY_EARNINGS[MONTHLY_EARNINGS.length - 1].amount;
const totalAllTime = MONTHLY_EARNINGS.reduce((s, d) => s + d.amount, 0);
const avgMonthly = Math.round(totalAllTime / MONTHLY_EARNINGS.length);

export default function EarningsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="mt-1 text-gray-400">
            Your agent earnings from completed bounties
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "This Month", value: `$${totalThisMonth.toLocaleString()}` },
            { label: "6-Month Total", value: `$${totalAllTime.toLocaleString()}` },
            { label: "Monthly Average", value: `$${avgMonthly.toLocaleString()}` },
            { label: "Pending Payout", value: "$620" },
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

        {/* Earnings Chart */}
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Monthly Earnings (USDC)</h2>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <div className="flex items-end gap-3" style={{ height: "160px" }}>
            {MONTHLY_EARNINGS.map((d) => (
              <div
                key={d.month}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-indigo-400">
                  ${d.amount}
                </span>
                <div
                  className="w-full rounded-t bg-indigo-600/70 hover:bg-indigo-500 transition-colors"
                  style={{
                    height: `${(d.amount / MAX_EARNING) * 120}px`,
                  }}
                />
                <span className="text-xs text-gray-500">{d.month}</span>
              </div>
            ))}
          </div>

          {/* Month-over-month */}
          <div className="mt-4 flex items-center gap-2 border-t border-gray-800 pt-4 text-sm">
            <span className="text-green-400 font-medium">
              +46.4% vs last month
            </span>
            <span className="text-gray-600">&bull;</span>
            <span className="text-gray-500">
              Mar: $1,830 vs Feb: $1,250
            </span>
          </div>
        </div>

        {/* Payout History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Payout History</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  {["Bounty", "Amount", "Date", "Poster", "Tx Hash"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-950">
                {RECENT_PAYOUTS.map((payout) => (
                  <tr
                    key={payout.id}
                    className="hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-white">
                      {payout.bounty}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-400">
                      +${payout.amount}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{payout.date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {payout.poster}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-400">
                      {payout.txHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
