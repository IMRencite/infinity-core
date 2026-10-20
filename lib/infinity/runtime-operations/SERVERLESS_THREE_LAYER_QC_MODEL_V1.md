# Serverless three-layer QC model (V1)

Production serverless routes must not treat **source-tree trace closure** as proof of **remote runtime bundle correctness**.

## Layers (distinct gates)

| Layer | Gate family | Question answered |
| --- | --- | --- |
| 1 | `SOURCE_TRACE_QC` | Are dependency declarations correct (manifest, `outputFileTracingIncludes`, no prohibited runtime `fs` reads on bundled paths)? |
| 2 | `BUILT_ARTIFACT_QC` | Does the **built** function artifact include required files/modules? |
| 3 | `COLD_START_RUNTIME_QC` | Does the **deployed** serverless function initialize without missing modules or unexpected disk reads? |

**Invariant:** `SOURCE_TRACE_QC` ≠ `BUILT_ARTIFACT_QC` ≠ `COLD_START_RUNTIME_QC`.

## Remote artifact observability limits

- Vercel **remote** deployment file listings (`/v6/deployments/{id}/files`) may include source paths and `out/` routes but **often do not expose** per-route `*.nft.json` trace manifests for remote-only production builds.
- When `.nft` introspection is unavailable on supported public APIs, classify:

  `REMOTE_NFT_ARTIFACT_VERIFICATION = UNAVAILABLE_ON_SUPPORTED_SURFACE`

  and **do not** mark `BUILT_ARTIFACT_QC` as PASS from source config alone.

- For `BUNDLED_MODULE` dependencies, prefer:

  - `BUILT_ARTIFACT_QC = PARTIAL_OBSERVABILITY` (remote metadata only where supported)
  - **`REMOTE_FUNCTION_MODULE_INIT_QC`** (decisive): non-mutating staged HTTP probe on the actual deployed function before promotion.

## Staged remote module-init probe (portfolio)

Pre-promote isolated deploy (`scripts/infinity-runtime-isolated-deploy.mjs`):

1. Build candidate deployment on Vercel; wait `READY`.
2. `GET /api/runtime/portfolio-operating-tick?mode=module-init-probe` on **candidate URL** with deploy-QC auth + `x-infinity-remote-module-init-probe: v1`.
3. Cron-shaped requests **must not** use probe mode (fail-closed).
4. Probe handler returns **before** ledger append, cycle creation, job enqueue, worker continuation, or provider calls.
5. Module import graph for the route still runs in the real serverless runtime — missing bundled deps fail like production cold start.
6. Require `STAGED_REMOTE_MODULE_INIT_PROBE_QC = PASS` before production promotion.

Implementation: `lib/infinity/runtime-operations/portfolio-module-init-probe-v1.ts`.

## Local vs remote false-pass regression

The `cde5c43` class defect proved:

`SOURCE_TRACE_QC = PASS` and local TypeScript import can coexist with **remote init ENOENT**.

Regression classifier (`REMOTE_MODULE_INIT_FALSE_PASS_REGRESSION_QC`) requires:

- `SOURCE_TRACE_QC = PASS`
- local import simulation may PASS
- **`REMOTE_FUNCTION_MODULE_INIT_QC = FAIL` ⇒ `PROMOTION_ALLOWED = false`**

## Natural production execution

Scheduled portfolio cycles (ledger + durable cycles + terminalization) remain **final behavioral confirmation** of continuity and trace repair. Remote probe + natural cycles are complementary, not interchangeable.

## Follow-up

Held quality release must register `SERVERLESS_RUNTIME_TRACE` in `PRODUCTION_QC_GATE_COVERAGE_V1` including `REMOTE_FUNCTION_MODULE_INIT_QC` for applicable deploy paths.
