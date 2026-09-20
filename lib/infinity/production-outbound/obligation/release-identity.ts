import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NamedOutboundLoopGate } from "../closed-loop";

export const COMMUNICATION_SCHEMA_VERSION_REQUIRED = "communication-recovery-release-v7" as const;
export const COMMUNICATION_RELEASE_IDENTITY_FILE = "release-identity.json" as const;

export type CommunicationReleaseIdentity = {
  deployable_unit: "infinity-runtime";
  release_sha: string;
  release_tree_hash: string;
  release_dirty: boolean;
  build_graph_hash: string;
  schema_version_required: string;
  build_timestamp: string;
  release_sequence: string;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

let baked: CommunicationReleaseIdentity | null = null;

export function loadBakedReleaseIdentity(root = process.cwd()): CommunicationReleaseIdentity | null {
  if (baked) return baked;
  const candidates = [
    join(root, COMMUNICATION_RELEASE_IDENTITY_FILE),
    join(root, "public", COMMUNICATION_RELEASE_IDENTITY_FILE),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      baked = JSON.parse(readFileSync(file, "utf8")) as CommunicationReleaseIdentity;
      return baked;
    } catch {
      return null;
    }
  }
  return null;
}

export function runtimeReleaseIdentity(): CommunicationReleaseIdentity {
  const file = loadBakedReleaseIdentity();
  return {
    deployable_unit: "infinity-runtime",
    release_sha: process.env.COMMUNICATION_RELEASE_SHA || file?.release_sha || "",
    release_tree_hash: process.env.COMMUNICATION_RELEASE_TREE_HASH || file?.release_tree_hash || "",
    release_dirty: (process.env.COMMUNICATION_RELEASE_DIRTY || String(file?.release_dirty ?? "true")) === "true",
    build_graph_hash: process.env.COMMUNICATION_BUILD_GRAPH_HASH || file?.build_graph_hash || "",
    schema_version_required: COMMUNICATION_SCHEMA_VERSION_REQUIRED,
    build_timestamp: file?.build_timestamp || "",
    release_sequence: process.env.COMMUNICATION_RELEASE_SEQUENCE || file?.release_sequence || "v4",
  };
}

export function classifyIdentityField(expected: string | null | undefined, observed: string | null | undefined): "MATCH" | "MISMATCH" | "ABSENT" {
  if (!expected || !observed) return "ABSENT";
  return expected === observed ? "MATCH" : "MISMATCH";
}

export function evaluateRuntimeReleaseParityGateV4(input: {
  intended: CommunicationReleaseIdentity;
  observed: Partial<CommunicationReleaseIdentity> & { deployment_id?: string | null };
  intended_deployment: string | null;
  observed_deployment: string | null;
  schema_seen: string | null;
  fresh: boolean;
}): NamedOutboundLoopGate {
  const sha = classifyIdentityField(input.intended.release_sha, input.observed.release_sha);
  const tree = classifyIdentityField(input.intended.release_tree_hash, input.observed.release_tree_hash);
  const dpl = classifyIdentityField(input.intended_deployment, input.observed_deployment);
  const schema = classifyIdentityField(input.intended.schema_version_required, input.schema_seen);
  const pass = sha === "MATCH" && tree === "MATCH" && dpl === "MATCH" && schema === "MATCH" && !input.intended.release_dirty && input.fresh;
  return named("RuntimeReleaseParityGate", pass ? "PASS" : "FAIL", [sha, tree, dpl, schema, input.fresh ? "FRESH" : "STALE"]);
}

export function evaluateCommunicationSchemaParityGate(input: {
  required: string;
  seen: string | null;
}): NamedOutboundLoopGate {
  return named(
    "CommunicationSchemaParityGate",
    input.required && input.seen === input.required ? "PASS" : "FAIL",
    [input.required, input.seen ?? "ABSENT"],
  );
}
