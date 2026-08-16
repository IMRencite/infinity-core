/**
 * RUN_PREPARE_AUTONOMOUS_LIVE_RETRY_2_2=true node scripts/prepare-autonomous-live-retry-2-2.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepareAutonomousLiveLaunchRetry22 } from "@/lib/infinity/launch-gateway/prepare-autonomous-live-retry-2-1";
import {
  DEPLOYABLE_NEXTJS_VERSION,
  validateNextJsVersionForVercel,
} from "@/lib/infinity/production-artifact/nextjs-version-policy";
import { reconstructProductionArtifact } from "@/lib/infinity/production-artifact/materialize";

describe("Prepare Autonomous Live Launch Retry #2.2", () => {
  it.skipIf(process.env.RUN_PREPARE_AUTONOMOUS_LIVE_RETRY_2_2 !== "true")(
    "builds patched nextjs artifact and prepares launch without live mutations",
    async () => {
      const admin = createAdminClient();
      const report = await prepareAutonomousLiveLaunchRetry22(admin);
      console.log(JSON.stringify(report, null, 2));

      expect(report.externalMutationsPerformed).toBe(0);
      expect(report.historicalPreserved).toBe(true);
      expect(report.finalStatus).toBe("READY FOR AUTONOMOUS LIVE EXECUTION #2.2");
      expect(report.productionArtifact.framework).toBe("nextjs");
      expect(report.autonomousAuthorizations).toBeGreaterThan(0);
      expect(report.humanApprovalsRequired).toBe(0);
      expect(report.vercelReadiness.vulnerabilityGate).toBe("PASS");
      expect(report.productionArtifact.packageValidation).toBe("PASS");
      expect(report.productionArtifact.cleanRoomBuild).toBe("PASS");

      const artifactId = String(report.productionArtifact.artifactId);
      const { data: assemblyRow } = await admin
        .from("venture_assemblies")
        .select("organization_id")
        .eq("id", report.assembly.assemblyId)
        .single();
      const orgId = String(assemblyRow!.organization_id);

      const { files } = await reconstructProductionArtifact(admin, orgId, artifactId);
      const pkgFile = files.find((f) => f.relativePath === "package.json");
      expect(pkgFile).toBeTruthy();
      const pkg = JSON.parse(pkgFile!.contentText) as { dependencies?: { next?: string } };
      expect(pkg.dependencies?.next).toBe(DEPLOYABLE_NEXTJS_VERSION);
      expect(validateNextJsVersionForVercel(pkg.dependencies?.next).acceptable).toBe(true);
      expect(pkg.dependencies?.next).not.toBe("15.1.0");
    },
    900_000,
  );
});
