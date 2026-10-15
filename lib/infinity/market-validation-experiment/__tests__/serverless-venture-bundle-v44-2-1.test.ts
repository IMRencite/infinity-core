import { existsSync, mkdtempSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH } from "../resolve-frozen-semantic-nav-width-muted-text-bundle";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash,
  readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot,
} from "../read-frozen-semantic-nav-width-muted-text-deploy-successor-snapshot";
import { reconstructOccupancynpvLegalSurfaceSuccessor } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { composeOccupancyNpvOrganicLiveFilesSafe } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { destinationSourcesPresent } from "@/lib/infinity/organic-growth-engine/continuous/destination-source-pack";

describe("serverless venture bundle v44.2.1", () => {
  it("reads locked deploy successor manifest without cwd .infinity snapshot", () => {
    const prev = process.cwd();
    const empty = mkdtempSync(join(tmpdir(), "onpv-serverless-snapshot-"));
    process.chdir(empty);
    try {
      const snapshot = readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot();
      expect(snapshot.artifactId).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID);
      expect(snapshot.digest).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST);
      expect((snapshot.pageLoop?.files ?? []).length).toBeGreaterThan(0);
      const legal = reconstructOccupancynpvLegalSurfaceSuccessor();
      expect(legal.predecessorDigest).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST);
      const hashA = frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash(snapshot);
      const hashB = frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash(
        readFrozenSemanticNavWidthMutedTextDeploySuccessorSnapshot(),
      );
      expect(hashA).toBe(hashB);
      expect(JSON.stringify(snapshot)).not.toMatch(/VERCEL_TOKEN|SUPABASE_SERVICE_ROLE|sk_live/);
    } finally {
      process.chdir(prev);
    }
  });

  it("compose safe succeeds when cwd snapshot is absent but repo sources exist", () => {
    const snapPath = join(process.cwd(), FROZEN_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SNAPSHOT_PATH);
    if (!existsSync(snapPath)) {
      const present = destinationSourcesPresent();
      expect(present.predecessor).toBe(true);
      expect(composeOccupancyNpvOrganicLiveFilesSafe().ok).toBe(true);
      return;
    }
    const backup = `${snapPath}.v4421testbak`;
    renameSync(snapPath, backup);
    try {
      expect(destinationSourcesPresent().predecessor).toBe(true);
      expect(composeOccupancyNpvOrganicLiveFilesSafe().ok).toBe(true);
    } finally {
      renameSync(backup, snapPath);
    }
  });
});
