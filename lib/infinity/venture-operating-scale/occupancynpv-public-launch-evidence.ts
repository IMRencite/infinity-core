import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_PUBLIC_LAUNCH_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-public-launch.json" as const;

export const OCCUPANCYNPV_PUBLIC_LAUNCH_EVENT_PATH =
  ".infinity/venture-operating-scale/occupancynpv-launch-event.json" as const;

export const OCCUPANCYNPV_LAUNCH_PERFORMANCE_BASELINE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-launch-performance-baseline.json" as const;

export const OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION = "occupancynpv_public_launch_v1" as const;

export const OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORIZED = true;

export const OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY =
  "Founder-authorized public launch of the current OccupancyNPV production product, live payment system, fulfillment configuration, approved customer experience, current legal/commercial messaging, and governed acquisition systems." as const;

export type OccupancynpvPublicLaunchEvidence = {
  founder_authorization: true;
  authority: typeof OCCUPANCYNPV_FOUNDER_PUBLIC_LAUNCH_AUTHORITY;
  publicly_launched: "YES" | "NO";
  launched_at: string | null;
  policy_version: typeof OCCUPANCYNPV_PUBLIC_LAUNCH_POLICY_VERSION;
  production_url: "https://occupancynpv.com";
  artifact_id: string;
  digest: string;
  deployment_id: string;
  experiment_id: string;
  search_discovery: "SEARCH_DISCOVERY_ACTIVATED" | "SEARCH_PROVIDER_CONFIGURATION_REQUIRED";
  organic: "ACTIVE" | "OBSERVING" | "BLOCKED";
  outreach: "ACTIVE" | "OBSERVING" | "BLOCKED";
  creative_media: "ACTIVE" | "OBSERVING" | "BLOCKED";
};

export function readOccupancynpvPublicLaunchEvidence(): OccupancynpvPublicLaunchEvidence | null {
  if (!existsSync(OCCUPANCYNPV_PUBLIC_LAUNCH_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_PUBLIC_LAUNCH_EVIDENCE_PATH, "utf8")) as OccupancynpvPublicLaunchEvidence;
  } catch {
    return null;
  }
}

export function occupancynpvPubliclyLaunched(): boolean {
  return readOccupancynpvPublicLaunchEvidence()?.publicly_launched === "YES";
}

export function persistOccupancynpvPublicLaunchEvidence(evidence: OccupancynpvPublicLaunchEvidence) {
  mkdirSync(dirname(OCCUPANCYNPV_PUBLIC_LAUNCH_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_PUBLIC_LAUNCH_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}
