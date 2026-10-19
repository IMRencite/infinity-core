# Serverless three-layer QC model (V1)

Production serverless routes must not treat **source-tree trace closure** as proof of **runtime bundle correctness**.

## Layers (distinct gates)

| Layer | Gate family | Question answered |
| --- | --- | --- |
| 1 | `SOURCE_TRACE_QC` | Does declared config/manifest expect the right repo paths at build time? |
| 2 | `BUILT_ARTIFACT_TRACE_QC` | After `next build`, does the traced function bundle include required modules/files? |
| 3 | `COLD_START_RUNTIME_QC` | At module init (no monorepo source tree), does the handler load without unexpected disk reads? |

**Invariant:** `SOURCE_TRACE_QC` ≠ `BUILT_ARTIFACT_TRACE_QC` ≠ `COLD_START_RUNTIME_QC`.

## Applicable runtime deploy paths

Portfolio cron (`/api/runtime/portfolio-operating-tick`), portfolio job worker, and future paths registered under `SERVERLESS_RUNTIME_TRACE` in `PRODUCTION_QC_GATE_COVERAGE_V1` must require:

1. Runtime dependency declaration (`runtime-file-dependency-manifest.v1.json`, `outputFileTracingIncludes` where needed).
2. Post-build artifact validation (`SERVERLESS_BUILT_ARTIFACT_RUNTIME_DEPENDENCY_QC`).
3. Cold-start validation (`PORTFOLIO_BUILT_FUNCTION_COLD_START_QC`, job worker equivalent).

Pre-promote isolated deploy runs (2) and (3) before production promotion.

## Follow-up

`SERVERLESS_RUNTIME_TRACE` gate family is planned for the held quality release queue (`SERVERLESS_TRACE_GATE_COVERAGE_FOLLOWUP`). Continuity promotion does not wire that registry entry; trace repair on `c42b83f` lineage already enforces the three layers for portfolio paths.
