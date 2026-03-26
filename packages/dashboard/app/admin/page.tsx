const PROTOCOL_STATS = [
  { label: "Total Bounties", value: "4,821" },
  { label: "Active Agents", value: "1,209" },
  { label: "USDC in Escrow", value: "$184,700" },
  { label: "Total Paid Out", value: "$2.4M" },
  { label: "Open Disputes", value: "14" },
  { label: "Oracle Uptime", value: "99.98%" },
];

const ORACLES = [
  {
    id: "oracle-1",
    name: "Primary Oracle — Polygon",
    address: "0xOracle...0001",
    status: "Healthy",
    lastPing: "12s ago",
    verifications: 48201,
    successRate: "99.6%",
    latency: "1.2s",
  },
  {
    id: "oracle-2",
    name: "Backup Oracle — Polygon",
    address: "0xOracle...0002",
    status: "Healthy",
    lastPing: "14s ago",
    verifications: 2840,
    successRate: "99.1%",
    latency: "1.8s",
  },
  {
    id: "oracle-3",
    name: "Testnet Oracle",
    address: "0xOracle...0099",
    status: "Degraded",
    lastPing: "4m ago",
    verifications: 821,
    successRate: "91.2%",
    latency: "5.4s",
  },
];

const RECENT_ACTIONS = [
  {
    id: "aa-1",
    time: "2026-03-25 11:42",
    actor: "Admin",
    action: "Set max bounty reward to $10,000 USDC",
    type: "config",
  },
  {
    id: "aa-2",
    time: "2026-03-25 10:15",
    actor: "System",
    action: "Oracle failover triggered: primary latency spike",
    type: "alert",
  },
  {
    id: "aa-3",
    time: "2026-03-24 16:00",
    actor: "Admin",
    action: "Banned agent 0xBadA...ctoR for fraudulent submission",
    type: "action",
  },
  {
    id: "aa-4",
    time: "2026-03-24 09:30",
    actor: "Admin",
    action: "Protocol fee updated from 1.5% to 2.0%",
    type: "config",
  },
];

const ORACLE_STATUS_STYLES: Record<string, string> = {
  Healthy: "bg-green-500/10 text-green-400 border-green-500/30",
  Degraded: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Down: "bg-red-500/10 text-red-400 border-red-500/30",
};

const ACTION_TYPE_STYLES: Record<string, string> = {
  config: "text-blue-400",
  alert: "text-yellow-400",
  action: "text-red-400",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
            Admin
          </span>
          <h1 className="text-3xl font-bold">Protocol Admin Panel</h1>
        </div>
        <p className="mb-8 text-gray-400">
          Oracle management, protocol configuration, and network health
        </p>

        {/* Protocol Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROTOCOL_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center"
            >
              <p className="text-lg font-bold text-indigo-400">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Oracle Management */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Oracle Management</h2>
            <div className="space-y-4">
              {ORACLES.map((oracle) => (
                <div
                  key={oracle.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-xs ${ORACLE_STATUS_STYLES[oracle.status]}`}
                        >
                          {oracle.status}
                        </span>
                        <span className="text-xs text-gray-600">
                          {oracle.lastPing}
                        </span>
                      </div>
                      <h3 className="font-semibold">{oracle.name}</h3>
                      <p className="font-mono text-xs text-gray-500">
                        {oracle.address}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded border border-gray-700 px-3 py-1 text-xs hover:border-gray-600 transition-colors">
                        Ping
                      </button>
                      <button className="rounded border border-yellow-700/50 px-3 py-1 text-xs text-yellow-400 hover:border-yellow-600 transition-colors">
                        Pause
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-t border-gray-800 pt-3 text-center">
                    {[
                      { label: "Verifications", value: oracle.verifications.toLocaleString() },
                      { label: "Success Rate", value: oracle.successRate },
                      { label: "Avg Latency", value: oracle.latency },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <p className="text-sm font-bold text-white">
                          {metric.value}
                        </p>
                        <p className="text-xs text-gray-500">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add Oracle */}
              <button className="w-full rounded-xl border border-dashed border-gray-700 py-4 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors">
                + Register New Oracle
              </button>
            </div>
          </div>

          {/* Config + Activity */}
          <div className="space-y-6">
            {/* Protocol Config */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Protocol Configuration
              </h2>
              <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
                {[
                  { label: "Protocol Fee", value: "2.0%" },
                  { label: "Min Bounty Reward", value: "$5 USDC" },
                  { label: "Max Bounty Reward", value: "$10,000 USDC" },
                  { label: "Claim Timeout", value: "72 hours" },
                  { label: "Dispute Window", value: "48 hours" },
                ].map((cfg) => (
                  <div
                    key={cfg.label}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5"
                  >
                    <span className="text-sm text-gray-400">{cfg.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {cfg.value}
                      </span>
                      <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
              <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900 p-4">
                {RECENT_ACTIONS.map((action) => (
                  <div key={action.id} className="rounded-lg bg-gray-950 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-xs font-medium ${ACTION_TYPE_STYLES[action.type]}`}
                      >
                        {action.actor}
                      </span>
                      <span className="text-xs text-gray-600">
                        {action.time}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {action.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
