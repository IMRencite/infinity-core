# Infinity Architecture — Overview

This document is a **concise navigation guide**. The durable platform specification is **[`infinity-os-specification.md`](./infinity-os-specification.md)** (Infinity OS Specification v1.0).

| Document | Purpose |
| --- | --- |
| **[`infinity-os-specification.md`](./infinity-os-specification.md)** | **Authoritative** — architecture, lifecycle, engines, governance, phases |
| **[`INFINITY_ARCHITECTURE.md`](./INFINITY_ARCHITECTURE.md)** | Historical Alpha schema and RLS detail (legacy table names) |
| **[`AGENTS.md`](../AGENTS.md)** | Next.js 16 agent coding rules |

---

## Mission Runtime (Foundation v1)

**Mission Runtime** (`lib/infinity/mission-runtime/`) is the **lifecycle owner** for active missions. It advances work through durable stages using **bounded ticks** — each tick claims a runtime instance, evaluates at most **one** transition, requests the next unit of Command/Scheduler work, writes checkpoints, and releases locks.

- **Stages:** command → discovery → evaluation → validation → reasoning → executive → planning → allocation → scheduling → execution → review → completed
- **Status:** separate from stage (running, waiting, blocked, paused, etc.)
- **Persistence:** `mission_runtime_instances`, append-only `mission_runtime_transitions`, immutable `mission_runtime_checkpoints`
- **Locking:** lease columns + `claim_mission_runtime_instance` / `release_mission_runtime_instance` (service_role only)
- **Execution:** governed advisory reasoning via `reasoning.execute_advisory` worker; **OpenAI** first real provider (Responses API); default **`AI_REASONING_MODE=disabled`**; mock for offline tests; **Build Factory** not implemented (execution blocks on `build.*` jobs)
- **Production trigger:** future cron/queue calls `runMissionRuntimeTick` — not an in-process infinite loop

Dashboard: `/dashboard/runtime` and `/dashboard/reasoning` (read-only session visibility; production reasoning is initiated by Mission Runtime).

**Worker Capability Foundation v1** (`lib/infinity/workers/`) — universal governed worker contract, `worker_results` / `worker_artifacts`, safe internal workers only. Flow: approved plan step → Scheduler → `engine_jobs` → Registry → Worker Runtime dispatcher → validated result → optional QA review → Mission Runtime observes on a later tick.

**Build Factory Foundation v1** (`lib/infinity/build-factory/`) — internal sandbox workspaces; governed build and website worker capabilities.

**Website Build Worker Foundation v1** (`lib/infinity/website-builder/`) — generates **internal website source only** (static HTML or Next.js source files) inside approved sandboxes. Supported types: `static_website`, `nextjs_website`, `content_site`, `lead_generation_site`, `affiliate_site`. Deterministic design system (foundation — refinement pending), explicit content markers (`[CONTENT REQUIRED]`, etc.), bounded validation, independent `qa.verify_internal_website`, snapshot after QA. No npm install, shell, network, real AI, deployment, publishing, domains, hosting, repos, purchases, or external accounts.

---

> Infinity is an autonomous enterprise that continuously discovers, builds, acquires, optimizes, and compounds high-value assets to maximize the long-term enterprise value of its owner's portfolio.

**Founding Rule:** Infinity must not require a human prompt in order to create value.

Manual controls exist for governance, approvals, overrides, testing, investigation, policy changes, mission changes, and emergency controls — not as the normal source of work.

## Infinity HQ (`/dashboard`)

**Infinity HQ** is the operator **observability and control-plane UI** (Foundation v1). It aggregates read-only metrics, pipelines, health, alerts, and activity from durable records via `lib/infinity/hq/`. It does **not** own business logic, replace Mission Runtime, or bypass governance. **Venture blueprints** shown in HQ are **blueprint-only** — execution is not started. **Revenue tracking** is not implemented (no fabricated financial results). **Build Factory** remains future work. Bounded development controls (mission tick, pause/resume runtime, shadow reasoning) remain on `/dashboard/runtime` and existing server actions.

---

**Infinity** is an **Autonomous Venture Operating System** that continuously discovers, evaluates, validates, builds, acquires, launches, operates, improves, and compounds ventures and assets to **maximize long-term enterprise value** — within organization-defined constraints.

Infinity initiates work autonomously. Humans govern through mission, policy, and approval—not by submitting every idea manually.

---

## Locked Hierarchy

```text
Identity → Mission → Command → Planner → Scheduler → Registry → Engines → Workers → Memory → Portfolio Feedback
```

| Layer | One-line role |
| --- | --- |
| **Mission** | Active strategic objective optimizing for enterprise value (organization-specific content) |
| **Command** | Strategic intelligence; optimizes for enterprise value; decides priorities—does not execute specialized work |
| **Planner** | Versioned plans from Command decisions; queries Registry for feasible capabilities |
| **Scheduler** | Durable jobs, retries, locking; resolves capabilities via Registry |
| **Registry** | Authoritative catalog of engines, workers, builders, and modules—does not decide, plan, schedule, or execute |
| **Engines** | Broad capabilities (Discovery, Research, Build Factory, …) |
| **Workers** | Specialized execution units |

Full Registry definition: **[OS Specification §8](./infinity-os-specification.md#section-8--registry)**.

---

## Core Objects

| Term | Meaning |
| --- | --- |
| **Opportunity** | Potential business/asset under evaluation (before initiative) |
| **Initiative** | Temporary body of work (*DB: `projects`*) |
| **Venture** | Operating business (*DB: `companies`*) |
| **Asset** | First-class portfolio primitive — discrete created, acquired, or managed item (*DB: `assets`*, relationships, metrics, valuations) |
| **Portfolio** | Opportunities, initiatives, ventures, assets, capital, performance |

```text
Opportunity → Initiative → Venture → Assets
```

Assets may belong to ventures or exist independently.

---

## Autonomous Lifecycle

```text
Observe → Discover → Research → Evaluate → Validate → Decide → Allocate → Plan → Build → Launch → Operate → Grow → Measure → Learn → Compound → Observe again
```

Full stage definitions, entry criteria, and audit requirements: **[OS Specification §3](./infinity-os-specification.md#section-3--autonomous-lifecycle)**.

---

## Discovery Engine

Product name: **Discovery Engine**. Schema tables (legacy names): `opportunity_scans`, `opportunities`, `opportunity_evidence`, `opportunity_scores`, `engine_events`.

**Implemented:** deterministic stub discovery scan via Worker Runtime (development milestone).  
**Not yet implemented:** external sources, autonomous observation, real opportunity generation.

---

## Decision Engine and Capital Allocation Foundation v1

**Implemented (deterministic foundation):**

- `decision_models`, `opportunity_evaluations`, `resource_pools`, `allocation_proposals`, `resource_reservations`
- `lib/infinity/decision/` — model bootstrap, deterministic scoring, policy checks, recommendations, evaluation persistence
- `lib/infinity/allocation/` — zero-capacity pool bootstrap, allocation proposals, atomic SQL reservation helpers
- Capability `decision.evaluate_opportunity` + worker `opportunity-evaluation-worker`
- Command prioritizes unevaluated opportunities; Planner/Scheduler queue evaluation jobs
- Read-only `/dashboard/opportunities` (evaluation fields) and `/dashboard/allocations`

**Conservative v1 behavior:** missing dimensions tracked as unknown (not zero); sparse validation data cannot produce `approve_build`; zero-capacity pools block reservation; no ventures, assets, or real financial accounts.

**Not yet implemented:** LLM synthesis, real capital accounts, automatic initiative promotion, Build Factory handoff, unrestricted autonomous spending.

---

## Validation Engine Foundation v1

**Implemented (deterministic foundation):**

- `validation_models`, `validation_runs`, `validation_dimension_results`, `validation_findings`, `validation_requirements`
- `lib/infinity/validation/` — category scoring, blocking findings, recommendations, run persistence
- Capability `validation.run` + worker `validation-run-worker`
- Command enqueues validation after decision; Planner gating via `planner-gating.ts` (`approved_for_planning` only)
- Read-only `/dashboard/validation`

**Conservative v1 behavior:** unknown remains unknown; missing evidence lowers confidence; system-validation data alone cannot approve planning; validation never approves building or creates ventures/assets.

**AI Reasoning Layer:** intentionally **not implemented**. No LLM, external research, or web search in this milestone.

---

## Implementation Status (summary)

| Status | Items |
| --- | --- |
| **Done** | Auth, orgs, dashboard, onboarding, Discovery schema, RLS, terminology, Mission, policies, Command, Planner, Scheduler seam, Registry seed, durable jobs, Worker Runtime, dev Command controls, **Asset Foundation v1**, **Evidence/Knowledge/Memory Foundation v1**, **Opportunity Discovery Foundation v1**, **Decision Engine and Capital Allocation Foundation v1**, **Validation Engine Foundation v1** |
| **Not done** | AI Reasoning Layer / LLMs, continuous scheduler, autonomous observation, external evidence adapters, Build Factory, automated valuation models, real financial accounts, acquisitions, semantic search/embeddings |

Full current state: **[OS Specification §27](./infinity-os-specification.md#section-27--current-state)**.

Phased roadmap: **[OS Specification §25](./infinity-os-specification.md#section-25--implementation-phases)**.

---

## Legacy Names (intentional)

| Internal / DB | Product term |
| --- | --- |
| `projects` | Initiatives |
| `companies` | Ventures |
| `opportunity_*` tables | Discovery Engine domain |

Do not rename tables for terminology alone. See Architecture Freeze rules in the OS specification.
