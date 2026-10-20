import { applyOccupancynpvLegacyDeployBlock } from "./occupancynpv-legacy-deployment-retired-v1";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { CRE_VERCEL_PROJECT_ID, CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";

export const OCCUPANCYNPV_LAUNCH_MESSAGING_REPAIR_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-launch-messaging-repair-deployment.json" as const;

const PREVIOUS = {
  artifactId: "art_5eb5eeb74bfd2a300b85",
  digest: "aeac78ccd50e925616769802bbce778da18bca2edb18fe16cb4668b29321f54f",
  deploymentId: "dpl_rwCYzXkkKzWCypr9rotUbs9kbEvj",
} as const;

export async function executeOccupancynpvLaunchMessagingRepairDeployment(input: {
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
    previous_artifact_id: PREVIOUS.artifactId,
    previous_digest: PREVIOUS.digest,
    previous_deployment_id: PREVIOUS.deploymentId,
    artifact_id: composed.artifactId,
    digest: composed.digest,
    deployment_id: deploymentId,
    deployed,
    payment_activation_changed: 0,
    stripe_writes: 0,
    dns_writes: 0,
    supabase_migrations: 0,
    public_launch: 0,
    marketing_content_changed: "YES",
    reason: "Repair stale validation-stage public messaging to current OccupancyNPV product, payment, and fulfillment truth. PUBLICLY_LAUNCHED remains NO.",
    changed_routes: [
      "/",
      "/pricing",
      "/early-access",
      "/how-it-works",
      "/faq",
      "/terms-of-service",
      "/privacy-policy",
    ],
    safe_error: safeError,
    vercel_project_id: CRE_VERCEL_PROJECT_ID,
  };
  if (input.persistEvidence !== false) {
    mkdirSync(dirname(OCCUPANCYNPV_LAUNCH_MESSAGING_REPAIR_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_LAUNCH_MESSAGING_REPAIR_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return { composed, evidence, deployed, deploymentId, safeError };
}
