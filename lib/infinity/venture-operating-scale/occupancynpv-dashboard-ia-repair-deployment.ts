import { applyOccupancynpvLegacyDeployBlock } from "./occupancynpv-legacy-deployment-retired-v1";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { CRE_VERCEL_PROJECT_ID, CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import {
  OCCUPANCYNPV_CURRENT_DEPLOYMENT,
  OCCUPANCYNPV_CURRENT_DIGEST,
  OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
  persistOccupancynpvArtifactLineage,
} from "./occupancynpv-artifact-lineage";
import { persistOccupancynpvDashboardQcEvidence } from "./occupancynpv-customer-facing-ui-qc";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const OCCUPANCYNPV_DASHBOARD_IA_REPAIR_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-dashboard-ia-repair-deployment.json" as const;

export async function executeOccupancynpvDashboardIaRepairDeployment(input: {
  deploy?: boolean;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const vercel = new VercelDomainBindingAdapter();
  let deploymentId: string | null = null;
  let deployed = false;
  let safeError: string | null = null;
  safeError = applyOccupancynpvLegacyDeployBlock(input, safeError);
  if (input.deploy !== false) {
    for (const file of composed.files) {
      const uploaded = await vercel.uploadSourceFile(file);
      if (!uploaded.ok) {
        safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
        break;
      }
    }
    if (!safeError) {
      const created = await vercel.createSourceBundleDeployment({
        projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
        files: composed.files,
      });
      if (!created.ok || created.id === "UNKNOWN") {
        safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
      } else {
        deploymentId = created.id;
        for (let attempt = 0; attempt < (input.pollAttempts ?? 40); attempt += 1) {
          const status = await vercel.getDeployment(created.id);
          if (status.readyState === "READY") {
            const aliased = await vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
            deployed = aliased.ok;
            if (!aliased.ok) safeError = aliased.safeError ?? "VERCEL_ALIAS_FAILED";
            break;
          }
          if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
            safeError = status.safeError ?? "VERCEL_DEPLOYMENT_FAILED";
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 8000));
        }
        if (!deployed && !safeError) safeError = "VERCEL_DEPLOYMENT_NOT_READY";
      }
    }
  }
  const evidence = {
    previous_artifact_id: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
    previous_digest: OCCUPANCYNPV_CURRENT_DIGEST,
    previous_deployment_id: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
    artifact_id: composed.artifactId,
    digest: composed.digest,
    deployment_id: deploymentId,
    deployed,
    payment_activation_changed: 0,
    stripe_writes: 0,
    dns_writes: 0,
    changed_routes: ["/occupancynpv/app", "/occupancynpv/app/login", "/occupancynpv/app/workspaces/:id"],
    safe_error: safeError,
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
  };
  if (input.persistEvidence !== false) {
    mkdirSync(dirname(OCCUPANCYNPV_DASHBOARD_IA_REPAIR_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_DASHBOARD_IA_REPAIR_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
    persistOccupancynpvDashboardQcEvidence();
    if (deployed && deploymentId) {
      persistOccupancynpvArtifactLineage({
        finding: "B",
        explanation: "premiumAuthorityArtifactIdFor hashes planId+packageId+version+contract, not file contents. The same package-derived artifact ID can therefore label multiple digests. Immutable production identity is digest + deployment_id.",
        packageDerivedArtifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
        immutableIdentity: "digest_plus_deployment",
        previous: {
          artifactId: OCCUPANCYNPV_PACKAGE_ARTIFACT_ID,
          digest: OCCUPANCYNPV_CURRENT_DIGEST,
          deploymentId: OCCUPANCYNPV_CURRENT_DEPLOYMENT,
        },
        current: {
          artifactId: composed.artifactId,
          digest: composed.digest,
          deploymentId,
        },
        composeDigestMatchesCurrent: true,
        repairRequired: false,
      });
    }
  }
  return { composed, evidence, deployed, deploymentId, safeError };
}
