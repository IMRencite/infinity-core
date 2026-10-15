import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OccupancyVentureImageFingerprint } from "./blog-image-relevance-and-distinctness-qc";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

export const OCCUPANCY_IMAGE_FINGERPRINTS_BUNDLED_PATH = join(
  MODULE_DIR,
  "occupancy-image-fingerprints.bundled.json",
);

export const OCCUPANCY_IMAGE_FINGERPRINTS_PATH = join(
  process.cwd(),
  ".infinity/blog-os/occupancy-image-fingerprints.json",
);

export type OccupancyImageFingerprintArtifact = {
  generated_at: string;
  provider: string;
  model: string;
  fingerprints: OccupancyVentureImageFingerprint[];
};

export function readOccupancyImageFingerprints(): OccupancyImageFingerprintArtifact | null {
  const path = existsSync(OCCUPANCY_IMAGE_FINGERPRINTS_PATH)
    ? OCCUPANCY_IMAGE_FINGERPRINTS_PATH
    : existsSync(OCCUPANCY_IMAGE_FINGERPRINTS_BUNDLED_PATH)
      ? OCCUPANCY_IMAGE_FINGERPRINTS_BUNDLED_PATH
      : null;
  if (!path) return null;
  return JSON.parse(readFileSync(path, "utf8")) as OccupancyImageFingerprintArtifact;
}

export function writeOccupancyImageFingerprints(artifact: OccupancyImageFingerprintArtifact): void {
  mkdirSync(dirname(OCCUPANCY_IMAGE_FINGERPRINTS_PATH), { recursive: true });
  writeFileSync(OCCUPANCY_IMAGE_FINGERPRINTS_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
}
