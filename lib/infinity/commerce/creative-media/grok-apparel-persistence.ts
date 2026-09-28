import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type CreativeGenerationState = "GENERATED_NOT_PERSISTED" | "COMPLETE";

export type CreativeCandidateRecord = {
  candidate_id: string;
  direction_id: string;
  variant_index: number;
  provider: "xai";
  model: string;
  generation_state: CreativeGenerationState;
  content_hash: string | null;
  asset_path: string | null;
  replay_of: string | null;
  replay_reason?: "ASSET_PERSISTENCE_RECOVERY";
};

export function persistCreativeProviderImage(input: {
  candidate_id: string;
  direction_id: string;
  variant_index: number;
  b64: string;
  rootDir?: string;
  testRoot?: string;
  replay_of?: string | null;
  replay_reason?: CreativeCandidateRecord["replay_reason"];
}): CreativeCandidateRecord {
  const root = input.rootDir ?? process.cwd();
  const outDir = join(root, input.testRoot ?? "tmp-grok-apparel-canary");
  mkdirSync(outDir, { recursive: true });
  const fileName = `${input.candidate_id}.png`;
  const assetPath = join(outDir, fileName);
  const bytes = Buffer.from(input.b64, "base64");
  writeFileSync(assetPath, bytes);
  const reopened = readFileSync(assetPath);
  if (!reopened.length) {
    return {
      candidate_id: input.candidate_id,
      direction_id: input.direction_id,
      variant_index: input.variant_index,
      provider: "xai",
      model: "grok-imagine-image-2.0",
      generation_state: "GENERATED_NOT_PERSISTED",
      content_hash: null,
      asset_path: null,
      replay_of: input.replay_of ?? null,
      replay_reason: input.replay_reason,
    };
  }
  const content_hash = createHash("sha256").update(reopened).digest("hex");
  return {
    candidate_id: input.candidate_id,
    direction_id: input.direction_id,
    variant_index: input.variant_index,
    provider: "xai",
    model: "grok-imagine-image-2.0",
    generation_state: "COMPLETE",
    content_hash,
    asset_path: assetPath,
    replay_of: input.replay_of ?? null,
    replay_reason: input.replay_reason,
  };
}

export function assertCreativeGenerationComplete(record: CreativeCandidateRecord): void {
  if (record.generation_state !== "COMPLETE" || !record.asset_path || !record.content_hash) {
    throw new Error(`CREATIVE_GENERATION_INCOMPLETE:${record.generation_state}`);
  }
  if (!existsSync(record.asset_path)) {
    throw new Error("CREATIVE_ASSET_MISSING_ON_DISK");
  }
}

export function appendCreativeManifest(rootDir: string, record: CreativeCandidateRecord): void {
  const manifestPath = join(rootDir, "tmp-grok-apparel-manifest.json");
  const prior = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { candidates: CreativeCandidateRecord[] })
    : { candidates: [] as CreativeCandidateRecord[] };
  const next = prior.candidates.filter((row) => row.candidate_id !== record.candidate_id);
  next.push(record);
  writeFileSync(manifestPath, JSON.stringify({ candidates: next }, null, 2));
}
