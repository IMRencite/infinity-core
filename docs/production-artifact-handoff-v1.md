# Production Artifact Handoff + Deployment Readiness v1

## Canonical production deploy path (Vercel v1)

Infinity v1 uses **`git_integrated`** (`VERCEL_V1_DEPLOYMENT_MODE`):

1. Build Factory materializes a **`production_artifacts`** row plus **`production_artifact_files`** (full deployable tree, secrets excluded).
2. **`repository.push`** reconstructs the artifact, verifies `content_hash`, and pushes the **complete file tree** to GitHub (plus `INFINITY_ARTIFACT_IDENTITY.json`).
3. **`hosting.create_project`** creates a Vercel project linked to the GitHub repository with Next.js framework settings derived from the provider-neutral **`deployment_manifest`**.
4. **`hosting.deploy`** creates a deployment from the **artifact-backed Git commit** (`gitSource`: repo + `commit_sha`), polls until `readyState === READY`, classifies failures, then runs **HTTP verification** before any venture is **`externally_live`**.

The artifact hash and persisted file manifest remain the source of truth; the Git commit must correspond to that artifact (`launch_handoff_links`, `deployment_source_identity`).

Vercel readiness requires **package.json validation**, **clean-room install/build** (persisted on `production_artifacts`), and **`npm run validate:vercel-deployment-readiness`** before live deploy retry.

## Launch stages

Normalized stages are defined in `lib/infinity/production-artifact/constants.ts` (`LAUNCH_STAGES`). External API IDs alone do not mark launch success.

## Historical assemblies

Assemblies without `production_artifact_id` cannot pass launch readiness for new plans. Existing approved payloads and audit rows are not rewritten.

Changing deployment mode or artifact hash requires a **new external action / authorization evaluation** (do not reuse stale autonomous approval for changed deploy inputs).
