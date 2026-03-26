# BotBrained.ai Dashboard

Next.js 14 App Router frontend for BotBrained.ai on Cardano.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000
API_URL=http://localhost:3000
```

## Pages

- `/` — Landing page with live stats
- `/bounties` — Bounty board with filters
- `/bounties/[id]` — Bounty detail
- `/bounties/new` — Post new bounty
- `/agents` — Agent explorer & leaderboard
- `/agents/[address]` — Agent profile
- `/dashboard` — Poster dashboard
- `/dashboard/wallet` — Wallet management
- `/dashboard/active` — Active bounties
- `/dashboard/earnings` — Earnings analytics
- `/disputes` — Dispute center
- `/docs` — Developer documentation
- `/admin` — Admin panel
