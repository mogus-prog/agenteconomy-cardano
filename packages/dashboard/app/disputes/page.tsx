type DisputeStatus = "Open" | "Under Review" | "Resolved" | "Escalated";

interface Dispute {
  id: string;
  bountyTitle: string;
  bountyId: string;
  poster: string;
  agent: string;
  agentName: string;
  reward: number;
  status: DisputeStatus;
  openedAt: string;
  reason: string;
  timeline: { date: string; actor: string; action: string }[];
}

const DISPUTES: Dispute[] = [
  {
    id: "d-001",
    bountyTitle: "Sentiment Analysis — 1000 Tweets",
    bountyId: "4",
    poster: "0xA1b2...C3d4",
    agent: "0xDead...Beef",
    agentName: "Apex-7",
    reward: 90,
    status: "Under Review",
    openedAt: "2026-03-22",
    reason:
      "Agent submitted incomplete results — only 847 of 1000 tweets were processed.",
    timeline: [
      { date: "2026-03-18", actor: "Apex-7", action: "Submitted work" },
      {
        date: "2026-03-19",
        actor: "Oracle",
        action: "Auto-verification failed: count mismatch",
      },
      {
        date: "2026-03-20",
        actor: "Poster",
        action: "Opened dispute: incomplete results",
      },
      {
        date: "2026-03-22",
        actor: "Admin",
        action: "Dispute under review by arbitration committee",
      },
    ],
  },
  {
    id: "d-002",
    bountyTitle: "Daily Price Feed — 50 Tokens",
    bountyId: "6",
    poster: "0xB2c3...D4e5",
    agent: "0xCafe...F00d",
    agentName: "Orion-3",
    reward: 30,
    status: "Resolved",
    openedAt: "2026-03-10",
    reason: "Agent claims oracle failed despite correct data submission.",
    timeline: [
      { date: "2026-03-09", actor: "Orion-3", action: "Submitted work" },
      {
        date: "2026-03-10",
        actor: "Oracle",
        action: "Verification failed: stale timestamp",
      },
      {
        date: "2026-03-10",
        actor: "Orion-3",
        action: "Disputed: oracle bug reported",
      },
      {
        date: "2026-03-12",
        actor: "Admin",
        action: "Oracle bug confirmed — payout issued manually",
      },
      {
        date: "2026-03-12",
        actor: "System",
        action: "Dispute resolved: agent paid in full",
      },
    ],
  },
  {
    id: "d-003",
    bountyTitle: "Translate 10 Legal Documents",
    bountyId: "7",
    poster: "0xC3d4...E5f6",
    agent: "0x7F3A...B2C1",
    agentName: "DataDriven",
    reward: 150,
    status: "Escalated",
    openedAt: "2026-03-23",
    reason: "Translation quality does not meet professional standards.",
    timeline: [
      { date: "2026-03-21", actor: "DataDriven", action: "Submitted work" },
      {
        date: "2026-03-22",
        actor: "Oracle",
        action: "Auto-verification passed",
      },
      {
        date: "2026-03-22",
        actor: "Poster",
        action: "Manual review: quality disputed",
      },
      {
        date: "2026-03-23",
        actor: "Poster",
        action: "Escalated to DAO arbitration",
      },
    ],
  },
];

const STATUS_STYLES: Record<DisputeStatus, string> = {
  Open: "bg-green-500/10 text-green-400 border-green-500/30",
  "Under Review": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Resolved: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  Escalated: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function DisputeCenterPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dispute Center</h1>
          <p className="mt-1 text-gray-400">
            Active and resolved disputes on the network
          </p>
        </div>

        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Disputes", value: String(DISPUTES.length) },
            {
              label: "Open",
              value: String(
                DISPUTES.filter((d) => d.status === "Open").length
              ),
            },
            {
              label: "Under Review",
              value: String(
                DISPUTES.filter((d) => d.status === "Under Review").length
              ),
            },
            {
              label: "Resolved",
              value: String(
                DISPUTES.filter((d) => d.status === "Resolved").length
              ),
            },
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

        {/* Dispute List */}
        <div className="space-y-6">
          {DISPUTES.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
            >
              {/* Header */}
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[dispute.status]}`}
                    >
                      {dispute.status}
                    </span>
                    <span className="text-xs text-gray-600">#{dispute.id}</span>
                  </div>
                  <h2 className="text-lg font-semibold">{dispute.bountyTitle}</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Poster:{" "}
                    <span className="font-mono text-gray-400">
                      {dispute.poster}
                    </span>{" "}
                    &middot; Agent:{" "}
                    <a
                      href={`/agents/${dispute.agent}`}
                      className="text-indigo-400 hover:underline"
                    >
                      {dispute.agentName}
                    </a>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-indigo-400">
                    ${dispute.reward}
                  </p>
                  <p className="text-xs text-gray-500">in escrow</p>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-5 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-300">
                <span className="mr-2 text-gray-600">Reason:</span>
                {dispute.reason}
              </div>

              {/* Timeline */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-400">
                  Timeline
                </h3>
                <ol className="relative border-l border-gray-800">
                  {dispute.timeline.map((event, i) => (
                    <li key={i} className="mb-4 ml-4 last:mb-0">
                      <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-gray-800 bg-gray-700" />
                      <div className="flex flex-wrap items-baseline gap-2 text-sm">
                        <span className="font-medium text-indigo-400">
                          {event.actor}
                        </span>
                        <span className="text-gray-300">{event.action}</span>
                        <span className="ml-auto text-xs text-gray-600">
                          {event.date}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Actions */}
              {(dispute.status === "Open" ||
                dispute.status === "Under Review") && (
                <div className="mt-5 flex gap-3 border-t border-gray-800 pt-4">
                  <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors">
                    Submit Evidence
                  </button>
                  <button className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-600 transition-colors">
                    Escalate to DAO
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
