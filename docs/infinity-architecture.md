# Infinity Architecture — Overview

This document is a **concise navigation guide**. The durable platform specification is **[`infinity-os-specification.md`](./infinity-os-specification.md)** (Infinity OS Specification v1.0).

| Document | Purpose |
| --- | --- |
| **[`infinity-os-specification.md`](./infinity-os-specification.md)** | **Authoritative** — architecture, lifecycle, engines, governance, phases |
| **[`INFINITY_ARCHITECTURE.md`](./INFINITY_ARCHITECTURE.md)** | Historical Alpha schema and RLS detail (legacy table names) |
| **[`AGENTS.md`](../AGENTS.md)** | Next.js 16 agent coding rules |

---

## Founding Purpose

> Infinity is an autonomous enterprise that continuously discovers, builds, acquires, optimizes, and compounds high-value assets to maximize the long-term enterprise value of its owner's portfolio.

**Founding Rule:** Infinity must not require a human prompt in order to create value.

Manual controls exist for governance, approvals, overrides, testing, investigation, policy changes, mission changes, and emergency controls — not as the normal source of work.

---

## What Infinity Is

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

## Implementation Status (summary)

| Status | Items |
| --- | --- |
| **Done** | Auth, orgs, dashboard, onboarding, Discovery schema, RLS, terminology, Mission, policies, Command, Planner, Scheduler seam, Registry seed, durable jobs, Worker Runtime, dev Command controls, **Asset Foundation v1** |
| **Not done** | Continuous scheduler, autonomous observation, external evidence, Build Factory, automated valuation models, capital allocation, acquisitions, Memory/Knowledge, AI integrations |

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
