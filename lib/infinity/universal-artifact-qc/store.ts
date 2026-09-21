import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { MATERIAL_ARTIFACT_QC_CONTRACT, type MaterialArtifactQCContract } from "./contract";

export const UNIVERSAL_ARTIFACT_QC_STORE_PATH = ".infinity/universal-artifact-qc/artifacts.json" as const;

let rows: MaterialArtifactQCContract[] = [];
let hydrated = false;

function persistEnabled(): boolean {
  if (process.env.INFINITY_UNIVERSAL_QC_PERSIST === "0") return false;
  if (process.env.VITEST && process.env.INFINITY_UNIVERSAL_QC_PERSIST !== "1") return false;
  return true;
}

export function resetUniversalArtifactQcStore(): void {
  rows = [];
  hydrated = true;
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (!persistEnabled() || !existsSync(UNIVERSAL_ARTIFACT_QC_STORE_PATH)) return;
  try {
    const parsed = JSON.parse(readFileSync(UNIVERSAL_ARTIFACT_QC_STORE_PATH, "utf8")) as {
      artifacts?: MaterialArtifactQCContract[];
    };
    rows = parsed.artifacts ?? [];
  } catch {
    rows = [];
  }
}

function persist(): void {
  if (!persistEnabled()) return;
  mkdirSync(dirname(UNIVERSAL_ARTIFACT_QC_STORE_PATH), { recursive: true });
  writeFileSync(
    UNIVERSAL_ARTIFACT_QC_STORE_PATH,
    `${JSON.stringify({ contract: MATERIAL_ARTIFACT_QC_CONTRACT, artifacts: rows }, null, 2)}\n`,
  );
}

export function listUniversalArtifactQc(): MaterialArtifactQCContract[] {
  hydrate();
  return rows.map((row) => ({ ...row, layer_results: row.layer_results.map((layer) => ({ ...layer })) }));
}

export function getUniversalArtifactQc(artifactId: string): MaterialArtifactQCContract | null {
  return listUniversalArtifactQc().find((row) => row.artifact_id === artifactId) ?? null;
}

export function upsertUniversalArtifactQc(artifact: MaterialArtifactQCContract): MaterialArtifactQCContract {
  hydrate();
  const next = { ...artifact, contract: MATERIAL_ARTIFACT_QC_CONTRACT };
  rows = [...rows.filter((row) => row.artifact_id !== next.artifact_id), next];
  persist();
  return { ...next };
}

export function findUniversalArtifactQcByBuild(builderExecutionId: string): MaterialArtifactQCContract | null {
  return listUniversalArtifactQc().find((row) => row.builder_execution_id === builderExecutionId) ?? null;
}
