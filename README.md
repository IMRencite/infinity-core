# Infinity Core

**Infinity** is an Autonomous Venture Operating System — an autonomous enterprise that continuously discovers, builds, acquires, optimizes, and compounds high-value assets to maximize the long-term enterprise value of its owner's portfolio.

**Founding Rule:** Infinity must not require a human prompt in order to create value.

## Architecture

| Document | Purpose |
| --- | --- |
| **[`docs/infinity-os-specification.md`](docs/infinity-os-specification.md)** | **Platform specification v1.0** (authoritative) |
| [`docs/infinity-architecture.md`](docs/infinity-architecture.md) | Concise overview and navigation |
| [`docs/INFINITY_ARCHITECTURE.md`](docs/INFINITY_ARCHITECTURE.md) | Historical Alpha schema and RLS reference |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure Supabase via `.env.local` (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side Worker Runtime only; never expose to the browser)

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
npm run test     # Vitest unit tests
npm run start    # production server
npm run db:push  # apply Supabase migrations
npm run db:types # regenerate database types
```

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, RLS)

## Current build (accurate)

**Implemented:** Mission, mission policies, Command, Planner, Scheduler, Registry seed, durable engine jobs, Worker Runtime, deterministic discovery scan, development Command controls, **Asset Foundation v1**, **Evidence/Knowledge/Memory Foundation v1**, **Opportunity Discovery Foundation v1**, **Decision Engine and Capital Allocation Foundation v1**.

**Not yet implemented:** continuous scheduler, autonomous observation, external source adapters, Build Factory, venture creation, semantic embeddings, AI synthesis, automated valuation models, real financial accounts.

See **[OS Specification §27](docs/infinity-os-specification.md#section-27--current-state)** for the full list.
