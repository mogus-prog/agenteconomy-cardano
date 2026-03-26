const TRANSACTIONS = [
  {
    id: "tx-001",
    type: "Escrow Fund",
    bounty: "Scrape 500 Product Pages",
    amount: -120,
    date: "2026-03-20",
    hash: "0xabc1...def2",
    status: "Confirmed",
  },
  {
    id: "tx-002",
    type: "Bounty Payout",
    bounty: "Weekly SEO Report",
    amount: -75,
    date: "2026-03-22",
    hash: "0xbcd2...ef34",
    status: "Confirmed",
  },
  {
    id: "tx-003",
    type: "Escrow Refund",
    bounty: "Cancelled Monitoring Task",
    amount: 50,
    date: "2026-03-18",
    hash: "0xcde3...f456",
    status: "Confirmed",
  },
  {
    id: "tx-004",
    type: "Deposit",
    bounty: "—",
    amount: 500,
    date: "2026-03-15",
    hash: "0xdef4...5678",
    status: "Confirmed",
  },
  {
    id: "tx-005",
    type: "Escrow Fund",
    bounty: "Translate 20 Blog Posts",
    amount: -200,
    date: "2026-03-24",
    hash: "0xef56...789a",
    status: "Pending",
  },
];

const SPENDING_POLICIES = [
  {
    id: "pol-1",
    name: "Max per bounty",
    value: "$500 USDC",
    enabled: true,
  },
  {
    id: "pol-2",
    name: "Daily spend limit",
    value: "$2,000 USDC",
    enabled: true,
  },
  {
    id: "pol-3",
    name: "Auto-refund on expiry",
    value: "Enabled",
    enabled: true,
  },
  {
    id: "pol-4",
    name: "Require 2FA for >$1k",
    value: "Disabled",
    enabled: false,
  },
];

export default function WalletDashboardPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="mt-1 text-gray-400">
            Balance, transactions, and spending policies
          </p>
        </div>

        {/* Balance Card */}
        <div className="mb-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-gray-900 p-8">
          <p className="mb-1 text-sm text-gray-400">Available Balance</p>
          <p className="text-5xl font-black text-white">
            $1,847<span className="text-2xl text-gray-500">.32</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">USDC &middot; Polygon</p>
          <div className="mt-6 flex gap-3">
            <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors">
              Deposit
            </button>
            <button className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-semibold hover:border-gray-500 transition-colors">
              Withdraw
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Transactions */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Recent Transactions</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-gray-900">
                  <tr>
                    {["Type", "Bounty", "Amount", "Date", "Status"].map(
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
                  {TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {tx.type}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-gray-400">
                        {tx.bounty}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${tx.amount < 0 ? "text-red-400" : "text-green-400"}`}
                      >
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${tx.status === "Confirmed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Policy Editor */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Spending Policies</h2>
            <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
              {SPENDING_POLICIES.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {policy.name}
                    </p>
                    <p className="text-xs text-gray-500">{policy.value}</p>
                  </div>
                  <div
                    className={`h-5 w-9 rounded-full ${policy.enabled ? "bg-indigo-600" : "bg-gray-700"}`}
                  >
                    <div
                      className={`h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${policy.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </div>
                </div>
              ))}
              <button className="mt-2 w-full rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:border-gray-600 hover:text-white transition-colors">
                Edit Policies
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
