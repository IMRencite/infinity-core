import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

export const SERVERLESS_FUNCTION_COLD_START_QC = "SERVERLESS_FUNCTION_COLD_START_QC" as const;
export const PORTFOLIO_BUILT_FUNCTION_COLD_START_QC = "PORTFOLIO_BUILT_FUNCTION_COLD_START_QC" as const;

export async function probePortfolioCommerceBundledModuleColdStart(repoRoot: string): Promise<{
  ok: boolean;
  reason: string | null;
}> {
  const canonicalPath = join(repoRoot, "lib/infinity/commerce/canonical-variant-identity-v1.ts");
  const sandbox = mkdtempSync(join(tmpdir(), "portfolio-cold-start-"));
  try {
    if (existsSync(join(sandbox, "lib/infinity/commerce/canonical-variant-identity-v1.ts"))) {
      rmSync(join(sandbox, "lib/infinity/commerce/canonical-variant-identity-v1.ts"));
    }
    mkdirSync(join(sandbox, "lib/infinity/commerce"), { recursive: true });
    writeFileSync(
      join(sandbox, "lib/infinity/commerce/.keep"),
      "sandbox must not read canonical-variant-identity-v1.ts from disk\n",
    );
    const modulePath = join(repoRoot, "lib/infinity/commerce/club-throttle-retail-v2-storefront-files.ts");
    const mod = await import(pathToFileURL(modulePath).href);
    const files = mod.clubThrottleRetailV2StorefrontFiles();
    const canonical = files.find((f: { path: string }) => f.path === "lib/canonical-variant-identity.ts");
    if (!canonical?.content?.includes("CANONICAL_VARIANT_IDENTITY_VERSION")) {
      return { ok: false, reason: "STOREFRONT_CANONICAL_EMBED_MISSING" };
    }
    if (existsSync(canonicalPath)) {
      const { readFileSync } = await import("node:fs");
      const disk = readFileSync(canonicalPath, "utf8");
      const norm = (s: string) => s.replace(/\r\n/g, "\n");
      if (norm(canonical.content) !== norm(disk)) {
        return { ok: false, reason: "STOREFRONT_EMBED_DRIFT_FROM_CANONICAL_SOURCE" };
      }
    }
    return { ok: true, reason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ENOENT.*canonical-variant-identity-v1\.ts/i.test(message)) {
      return { ok: false, reason: "ENOENT_CANONICAL_VARIANT_SOURCE_FILE" };
    }
    return { ok: false, reason: message };
  } finally {
    try {
      rmSync(sandbox, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function probePortfolioOperatingTickRouteImport(repoRoot: string): Promise<{ ok: boolean; reason: string | null }> {
  try {
    const routePath = join(repoRoot, "app/api/runtime/portfolio-operating-tick/route.ts");
    await import(pathToFileURL(routePath).href);
    return { ok: true, reason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ENOENT.*canonical-variant-identity-v1\.ts/i.test(message)) {
      return { ok: false, reason: "ENOENT_CANONICAL_VARIANT_SOURCE_FILE" };
    }
    return { ok: false, reason: message };
  }
}

export async function evaluateServerlessFunctionColdStartQc(input: { repoRoot?: string }): Promise<{
  SERVERLESS_FUNCTION_COLD_START_QC: "PASS" | "FAIL";
  PORTFOLIO_BUILT_FUNCTION_COLD_START_QC: "PASS" | "FAIL";
  PORTFOLIO_JOB_WORKER_COLD_START_QC: "PASS" | "FAIL";
  details: Record<string, string | null>;
}> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const commerce = await probePortfolioCommerceBundledModuleColdStart(repoRoot);
  const route = await probePortfolioOperatingTickRouteImport(repoRoot);
  const pass = commerce.ok && route.ok;
  return {
    SERVERLESS_FUNCTION_COLD_START_QC: pass ? "PASS" : "FAIL",
    PORTFOLIO_BUILT_FUNCTION_COLD_START_QC: route.ok ? "PASS" : "FAIL",
    PORTFOLIO_JOB_WORKER_COLD_START_QC: commerce.ok ? "PASS" : "FAIL",
    details: {
      commerce: commerce.reason,
      portfolio_operating_tick_route: route.reason,
    },
  };
}
