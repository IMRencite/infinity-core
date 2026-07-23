# Infinity Architecture

**Source of truth** for Infinity product and system terminology. For historical database schema detail, see [`INFINITY_ARCHITECTURE.md`](./INFINITY_ARCHITECTURE.md).

| Field | Value |
| --- | --- |
| Document version | 1.0 |
| Product | Autonomous Venture Operating System |
| Repository | `infinity-core` |

---

## What Infinity Is

**Infinity** is an **Autonomous Venture Operating System** — a system that observes markets, discovers opportunities, researches and scores them, validates hypotheses, decides what to build, plans execution, builds ventures, launches them, grows them, measures outcomes, and learns continuously.

Infinity is not a chatbot, a code generator, or a generic project manager. It is an orchestrated stack of strategic and execution capabilities operating under human approval boundaries.

---

## Locked Architecture Hierarchy

```text
Mission
  → Command
  → Planner
  → Scheduler
  → Engines
  → Workers
```

| Layer | Role |
| --- | --- |
| **Mission** | Defines the active strategic objective for the organization or portfolio. |
| **Command** | Central strategic intelligence. Evaluates system state, determines what should happen next, allocates priorities and resources, requests plans, and monitors outcomes. Command does **not** perform specialized work itself. |
| **Planner** | Turns Command decisions into structured execution plans, dependencies, milestones, and required capabilities. |
| **Scheduler** | Queues, prioritizes, locks, retries, and coordinates durable jobs. |
| **Engines** | Own broad capabilities: Discovery, Research, Validation, Knowledge, Build Factory, Growth, Portfolio Intelligence, and related domains. |
| **Workers** | Perform specialized execution: development, design, SEO, marketing, finance, legal, sales, customer support, and similar tasks. |

---

## Core Domain Terminology

| Term | Definition |
| --- | --- |
| **Organization** | Tenant boundary. All business data is organization-scoped. |
| **Opportunity** | A potential business, asset, acquisition, partnership, or investment discovered and evaluated **before** promotion into an initiative. |
| **Initiative** | A body of approved or active work. Research, validation, building, launching, and major optimization efforts may each be represented as initiatives. |
| **Venture** | A launched or operational business owned or managed within the portfolio. |
| **Portfolio** | Cross-venture performance, capital allocation, and shared assets. |

### Promotion path

```text
Opportunity → (approve / validate) → Initiative → (launch) → Venture
```

An **opportunity must exist before** an initiative or venture is created.

---

## Engine Roles (Locked Names)

| Legacy / informal name | Locked name | Responsibility |
| --- | --- | --- |
| Opportunity Engine | **Discovery Engine** | Autonomous market scanning, opportunity discovery, evidence attachment, scoring inputs |
| Company Builder / Build Engine | **Build Factory** | Architecture, implementation, QA, and launch preparation for ventures |
| CEO Engine | **Command** | Strategic orchestration and prioritization (see hierarchy above) |

**Workers** replace “AI Agents” in product language when describing specialized execution actors.

---

## Discovery Engine and Data Model

The **Discovery Engine** creates `opportunity_scans`, discovers `opportunities`, and attaches `opportunity_evidence` and versioned `opportunity_scores`. Activity is recorded in `engine_events`.

Database table names retain the `opportunity_*` prefix for compatibility. Product language uses **Discovery Engine**; schema names are implementation detail.

---

## Autonomous Lifecycle

```text
Observe
  → Discover
  → Research
  → Score
  → Validate
  → Decide
  → Plan
  → Build
  → Launch
  → Grow
  → Measure
  → Learn
  → Observe again
```

---

## Current Implementation Status

| Area | Status |
| --- | --- |
| Next.js app shell, auth, dashboard | **Implemented** |
| Organizations and membership | **Implemented** |
| Live dashboard counts (legacy `projects` / `companies` tables) | **Implemented** |
| Discovery Engine data foundation (`opportunity_scans`, `opportunities`, `opportunity_evidence`, `opportunity_scores`, `engine_events`) | **Migration created** |
| Command, Planner, Scheduler | **Not implemented** |
| AI-assisted Discovery, Research, Scoring automation | **Not implemented** |
| Initiative / Venture promotion workflows | **Not implemented** |
| Build Factory and Workers | **Not implemented** |

### Legacy names preserved in code

| Legacy internal name | Product term | Notes |
| --- | --- | --- |
| `projects` table | Initiatives | UI label only; table not renamed |
| `companies` table | Ventures | UI label only; table not renamed |
| Route placeholders (`#`) | TBD routes | No `/dashboard/projects` routes exist yet |

---

## Near-Term Roadmap

1. **Discovery Engine data foundation** — completed
2. Command and orchestration foundation
3. Planner
4. Scheduler and durable jobs
5. AI-assisted Discovery Engine
6. Research and evidence collection
7. Scoring and Validation
8. Initiative promotion and approval policies
9. Business Architect
10. Build Factory
11. Execution Workers
12. Growth and Portfolio Intelligence

---

## Related Documents

- [`INFINITY_ARCHITECTURE.md`](./INFINITY_ARCHITECTURE.md) — detailed Alpha schema, RLS, and historical specification (v0.1)
- [`AGENTS.md`](../AGENTS.md) — Next.js 16 agent rules for this repository
