import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OccupancyVentureImageFingerprint } from "./blog-image-relevance-and-distinctness-qc";
import bundledFingerprints from "./occupancy-image-fingerprints.bundled.json";

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
  if (existsSync(OCCUPANCY_IMAGE_FINGERPRINTS_PATH)) {
    return JSON.parse(readFileSync(OCCUPANCY_IMAGE_FINGERPRINTS_PATH, "utf8")) as OccupancyImageFingerprintArtifact;
  }
  if (existsSync(OCCUPANCY_IMAGE_FINGERPRINTS_BUNDLED_PATH)) {
    return JSON.parse(readFileSync(OCCUPANCY_IMAGE_FINGERPRINTS_BUNDLED_PATH, "utf8")) as OccupancyImageFingerprintArtifact;
  }
  return bundledFingerprints as OccupancyImageFingerprintArtifact;
}

export function writeOccupancyImageFingerprints(artifact: OccupancyImageFingerprintArtifact): void {
  mkdirSync(dirname(OCCUPANCY_IMAGE_FINGERPRINTS_PATH), { recursive: true });
  writeFileSync(OCCUPANCY_IMAGE_FINGERPRINTS_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
}
