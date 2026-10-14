# Stonk War vertical slice

A client-side demo of 60-second stock battles across NVDA, TSLA, AMD, META, COIN, and PLTR. Each round combines a random matchup with one of ten deterministic, mirrorable race profiles. Built with Next.js, React, TypeScript, and Tailwind CSS for direct Vercel deployment.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run test
npm run typecheck
npm run build
```

All balances, bets, prices, payouts, and token holdings are simulated in browser memory. Reloading the page starts a fresh demo session.
