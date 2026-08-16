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
- **Execution:** governed advisory reasoning via `reasoning.execute_advisory` worker; **OpenAI** first real provider (Responses API); default **`AI_REASONING_MODE=disabled`**; mock for offline tests; **Build Factory Runtime v2** for governed internal builds via Scheduler + Worker Runtime (website builders as registry adapters); **public deploy/publish/launch unimplemented**
- **Production trigger:** future cron/queue calls `runMissionRuntimeTick` — not an in-process infinite loop

Dashboard: `/dashboard/runtime` and `/dashboard/reasoning` (read-only session visibility; production reasoning is initiated by Mission Runtime).

**Executive Context and Autonomous Selection v1** (`lib/infinity/executive-selection/`) — Mission Runtime schedules durable `executive.build_selection_context` when reasoning requires Executive context. Worker capabilities assemble org-scoped context, score eligible mission opportunities deterministically, optional mock/shadow/advisory AI (non-authoritative), evaluate constraints, assign dispositions (`select_for_planning`, `reject`, `monitor`, `request_more_validation`, `defer_due_to_constraints`, `escalate_for_human_review`), run independent QA, then finalize immutable `executive_selection_decisions` with planning eligibility. Executive selection does **not** create plans, builds, ventures, or files. Ordinary in-policy zero-cost selections proceed without CEO approval; escalation thresholds route to human review only.

**Executive Selection → Planner Handoff v1** — Canonical planning eligibility reads finalized `executive_selection_decisions` (`select_for_planning`, `planning_eligible`, QA passed) via `PlannerExecutiveAuthorization` (`lib/infinity/executive-selection/authorization.ts`). Legacy `executive_decisions` remain readable for v1 initiative paths only. Mission Runtime **executive** stage advances to **planning** on a bounded tick when canonical selection is eligible (waits on pending Executive jobs, QA, or escalation). **Planning** stage invokes `planner_executive_handoff` → `runMissionExecutivePlannerHandoff` → `createInitiativePlanFromExecutiveAuthorization` (one durable plan, bounded steps, no build/deploy/publish). Plan observation and advance to allocation occur on a **later** tick. Idempotency keys prevent duplicate plans, events, and authorization records. HQ mission inspector exposes compact canonical vs legacy handoff diagnostics.

**Build Factory Runtime v2 Foundation** — Extends `lib/infinity/build-factory/` (same Scheduler, Worker Runtime, workspaces). Generic **BuildJob** (`build_jobs`) is product-neutral; **BuilderPlugin** registry adapters (`website.internal_*`) wrap Website Build Worker v1 without duplicating generators. Entry: `requestBuildFactoryRuntimeV2`. Dual QA (product + `qa.verify_generic_internal_build`), bounded repair, rollback mode labeled (`metadata_only` unless byte-perfect verified). Internal completion only — not deployed or published.

**Autonomous Plan Execution Integration v1** (`lib/infinity/plan-execution/`, `plan_executions`) — Coordinates Mission Runtime **v2** stages (planning → allocation → scheduling → execution → review) with canonical Executive selection, zero-cost allocation, existing Scheduler, Build Factory v2, and Worker Runtime. One bounded transition per tick; workers do not advance Mission Runtime. Independent `qa.verify_autonomous_plan_execution`. Legacy v1 missions and missions with `disable_autonomous_plan_execution` metadata skip this path.

**Venture Assembly Foundation v1** (`lib/infinity/venture-assembly/`, `venture_assemblies`) — After **internally_complete** PlanExecution and reproducible Build Factory outputs, governed workers assemble a durable internal venture package (identity, business model, brand, digital property references, monetization, marketing, operations, legal placeholders, external dependency registry, launch-readiness evaluation). Capabilities: `venture.assemble_internal_package`, `qa.verify_venture_assembly`. Canonical operating venture record: `companies` (draft / pre_launch). **INFINITY CAN ASSEMBLE A VENTURE INTERNALLY. INFINITY CANNOT YET AUTONOMOUSLY LAUNCH THAT VENTURE INTO THE EXTERNAL WORLD.** Launch/deployment remains a separate milestone.

**Launch & Deployment Gateway Foundation v1** (`lib/infinity/launch-gateway/`, `external_actions`, `launch_plans`, `external_resources`) — Single **External Action Gateway** for all external effects. Workers route through `launch.simulate_external_action` (mock/simulation) and `launch.execute_external_action` (live, gated). Provider adapters: **mock.infinity_v1**, **github.com_v1**, **vercel.com_v1** behind `validate/estimate/simulate/execute/verify/rollback`. Live scope v1: `repository.create`, `repository.push`, `hosting.create_project`, `hosting.deploy`, `hosting.verify_deployment` only. Gates: `EXTERNAL_ACTIONS_LIVE_ENABLED`, `GITHUB_LIVE_ENABLED`, `VERCEL_LIVE_ENABLED`, `LIVE_PROVIDER_TEST_MODE` (all default false/missing). **Live execution is opt-in and fail-closed.**

**AI Website Generation Foundation v1** (`lib/infinity/ai-website-generation/`) — bounded context, strict `WebsiteGenerationPlan`, mock/shadow/advisory/disabled modes, governed approval, deterministic translation into Website Builder models. AI never writes source files directly.

**Website Build Worker Foundation v1** (`lib/infinity/website-builder/`) — internal website source in approved sandboxes; deterministic templates, honest markers, foundation validation, independent QA; not deployed or published.

---

> Infinity is an autonomous enterprise that continuously discovers, builds, acquires, optimizes, and compounds high-value assets to maximize the long-term enterprise value of its owner's portfolio.

**Founding Rule:** Infinity must not require a human prompt in order to create value.

Manual controls exist for governance, approvals, overrides, testing, investigation, policy changes, mission changes, and emergency controls — not as the normal source of work.

## Infinity HQ (`/dashboard`)

**Infinity HQ** is the operator **observability and control-plane UI** (Foundation v1). It aggregates read-only metrics, pipelines, health, alerts, and activity from durable records via `lib/infinity/hq/`. It does **not** own business logic, replace Mission Runtime, or bypass governance. **Venture blueprints** shown in HQ are **blueprint-only** — execution is not started. **Revenue tracking** is not implemented (no fabricated financial results). **Build Factory Runtime v2** internal build diagnostics are observable in HQ; **public deployment and launch** remain unimplemented. Bounded development controls (mission tick, pause/resume runtime, shadow reasoning) remain on `/dashboard/runtime` and existing server actions.

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

**Not yet implemented:** LLM synthesis, real capital accounts, automatic initiative promotion, **public Build Factory deploy/launch handoff**, unrestricted autonomous spending.

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
| **Not done** | AI Reasoning Layer / LLMs, continuous scheduler, autonomous observation, external evidence adapters, **public deployment and launch**, automated valuation models, real financial accounts, acquisitions, semantic search/embeddings |

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
