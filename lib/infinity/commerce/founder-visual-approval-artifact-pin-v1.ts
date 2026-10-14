import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import type { ClubThrottleGarmentColorSlug } from "./club-throttle-apparel-color-v1.ts";

export const FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1 = "FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1" as const;

export const FOUNDER_VISUAL_APPROVAL_PINS_REL =
  ".infinity/commerce/club-throttle-founder-visual-approval-pins-v1.json" as const;

export type FounderVisualApprovalPin = {
  version: typeof FOUNDER_VISUAL_APPROVAL_ARTIFACT_PIN_V1;
  venture: "CLUB_THROTTLE";
  sku: string;
  garment_color: ClubThrottleGarmentColorSlug;
  design_revision: string;
  asset_id: string;
  local_asset_path: string;
  sha256: string;
  width: number;
  height: number;
  transformation_recipe: string;
  approved_at: string;
  approval_type: "FOUNDER_VISUAL_DARK_GARMENT" | "FOUNDER_VISUAL_LIGHT_GARMENT";
};

export type FounderVisualApprovalPinStore = {
  updated_at: string;
  pins: FounderVisualApprovalPin[];
};

export function loadFounderVisualApprovalPins(cwd = process.cwd()): FounderVisualApprovalPinStore {
  const path = join(cwd, FOUNDER_VISUAL_APPROVAL_PINS_REL);
  if (!existsSync(path)) return { updated_at: new Date(0).toISOString(), pins: [] };
  return JSON.parse(readFileSync(path, "utf8")) as FounderVisualApprovalPinStore;
}

export function saveFounderVisualApprovalPins(cwd: string, store: FounderVisualApprovalPinStore): void {
  if (!durableLocalPersistEnabled()) return;
  const path = join(cwd, FOUNDER_VISUAL_APPROVAL_PINS_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`);
}

export function resolveFounderApprovalPin(input: {
  sku: string;
  garment_color: ClubThrottleGarmentColorSlug;
  cwd?: string;
}): FounderVisualApprovalPin | null {
  const store = loadFounderVisualApprovalPins(input.cwd);
  return (
    store.pins.find(
      (p) => p.sku === input.sku && p.garment_color === input.garment_color,
    ) ?? null
  );
}

export function founderVisualApprovalArtifactPinQc(cwd = process.cwd()): "PASS" | "PARTIAL" | "FAIL" {
  const store = loadFounderVisualApprovalPins(cwd);
  const requiredDark = [
    ["LOT_LINE", "black"],
    ["BAGGER_SEND", "black"],
    ["DUALSPORT_DUST", "black"],
    ["KNEE_DOWN", "black"],
  ] as const;
  let hit = 0;
  for (const [sku, color] of requiredDark) {
    const pin = store.pins.find((p) => p.sku === sku && p.garment_color === color);
    if (pin?.sha256 && existsSync(join(cwd, pin.local_asset_path))) hit++;
  }
  if (hit === requiredDark.length) return "PASS";
  if (hit > 0) return "PARTIAL";
  return "FAIL";
}
