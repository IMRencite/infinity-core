# Infinity Architecture — Overview

This document is a **concise navigation guide**. The durable platform specification is **[`infinity-os-specification.md`](./infinity-os-specification.md)** (Infinity OS Specification v1.0).

| Document | Purpose |
| --- | --- |
| **[`infinity-os-specification.md`](./infinity-os-specification.md)** | **Authoritative** — architecture, lifecycle, engines, governance, phases |
| **[`INFINITY_ARCHITECTURE.md`](./INFINITY_ARCHITECTURE.md)** | Historical Alpha schema and RLS detail (legacy table names) |
| **[`AGENTS.md`](../AGENTS.md)** | Next.js 16 agent coding rules |

---

## What Infinity Is

**Infinity** is an **Autonomous Venture Operating System** that continuously discovers, evaluates, validates, builds, launches, operates, and improves ventures and digital assets to maximize long-term portfolio value—within organization-defined constraints.

Infinity initiates work autonomously. Humans govern through mission, policy, and approval—not by submitting every idea manually.

---

## Locked Hierarchy

```text
Identity → Mission → Command → Planner → Scheduler → Registry → Engines → Workers → Memory → Portfolio Feedback
```

| Layer | One-line role |
| --- | --- |
| **Mission** | Active strategic objective (organization-specific content) |
| **Command** | Strategic intelligence; decides priorities and outcomes—does not execute specialized work |
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
| **Initiative** | Approved or active body of work (*DB: `projects`*) |
| **Venture** | Launched operating business (*DB: `companies`*) |
| **Asset** | Discrete created or managed item owned by a venture |
| **Portfolio** | Opportunities, initiatives, ventures, assets, capital, performance |

```text
Opportunity → Initiative → Venture → Assets
```

---

## Autonomous Lifecycle

```text
Observe → Discover → Research → Score → Validate → Decide → Plan → Build → Launch → Operate → Grow → Measure → Learn → Observe again
```

Full stage definitions, entry criteria, and audit requirements: **[OS Specification §3](./infinity-os-specification.md#section-3--autonomous-lifecycle)**.

---

## Discovery Engine (data foundation)

Product name: **Discovery Engine**. Schema tables (legacy names): `opportunity_scans`, `opportunities`, `opportunity_evidence`, `opportunity_scores`, `engine_events`.

**Schema migrated; autonomous discovery not yet running.**

---

## Implementation Status (summary)

| Status | Items |
| --- | --- |
| **Done** | Auth, orgs, dashboard, onboarding, Discovery **schema**, RLS, terminology |
| **Not done** | Command, Planner, Scheduler, **Registry**, AI discovery, validation, Build Factory, Workers |

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
