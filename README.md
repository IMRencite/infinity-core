# Infinity Core

**Infinity** is an Autonomous Venture Operating System — the application core for observing markets, discovering opportunities, validating ventures, building, launching, growing, and learning across a portfolio.

## Architecture

Product and system terminology: [`docs/infinity-architecture.md`](docs/infinity-architecture.md)

Detailed Alpha schema and RLS specification: [`docs/INFINITY_ARCHITECTURE.md`](docs/INFINITY_ARCHITECTURE.md)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure Supabase via `.env.local` (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
npm run start    # production server
```

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, RLS)
