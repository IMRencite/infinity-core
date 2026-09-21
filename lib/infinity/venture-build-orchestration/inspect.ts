import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateBuildAuthorization } from "./authorization";
import { compileExecutableVenturePlan } from "./compile";
import { CRE_CANDIDATE_ID } from "./fixtures";
import { compileInputFromIntelligence } from "./from-intelligence";
import type { BuildAuthorization } from "./types";

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export type CandidateBuildInspection = {
  id: string;
  name: string;
  decision: string;
  buildReady: boolean;
  authorization: BuildAuthorization;
  nextGovernedStep: string;
  origin: string | null;
};

export async function inspectCanonicalCandidateBuildAuthority(
  candidateId = CRE_CANDIDATE_ID,
): Promise<CandidateBuildInspection | null> {
  if (!loadEnvLocal()) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { loadCanonicalCandidateIntelligence } = await import("@/lib/infinity/venture-intelligence/load");
  const view = await loadCanonicalCandidateIntelligence(createAdminClient(), LIVE_ORG, candidateId);
  const compile = compileInputFromIntelligence(view, { organizationId: LIVE_ORG });
  const { plan } = compileExecutableVenturePlan(compile);
  return {
    id: candidateId,
    name: view.identity.name,
    decision: plan.buildAuthorization.decision,
    buildReady: plan.buildAuthorization.buildReady,
    authorization: plan.buildAuthorization,
    nextGovernedStep: plan.buildAuthorization.nextGovernedStep,
    origin: view.sourceContext.id,
  };
}

export async function findRealBuildReadyAutonomousVenture(): Promise<CandidateBuildInspection | null> {
  if (!loadEnvLocal()) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("opportunity_candidates")
    .select("id, title")
    .eq("organization_id", LIVE_ORG)
    .limit(25);
  const { loadCanonicalCandidateIntelligence } = await import("@/lib/infinity/venture-intelligence/load");
  for (const row of data ?? []) {
    const id = String((row as { id?: unknown }).id ?? "");
    if (!id || id === "69d45f14-ca07-4a30-b601-54af6d05953f") continue;
    try {
      const view = await loadCanonicalCandidateIntelligence(admin, LIVE_ORG, id);
      if (view.sourceContext.id === "FOUNDER_IDEA") continue;
      const compile = compileInputFromIntelligence(view, { organizationId: LIVE_ORG });
      const auth = evaluateBuildAuthorization(compile);
      if (auth.result === "AUTHORIZED_BUILD") {
        return {
          id,
          name: view.identity.name,
          decision: auth.decision,
          buildReady: auth.buildReady,
          authorization: auth,
          nextGovernedStep: auth.nextGovernedStep,
          origin: view.sourceContext.id,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
