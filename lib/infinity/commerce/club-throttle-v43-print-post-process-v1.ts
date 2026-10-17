import { readFileSync, writeFileSync } from "node:fs";
import type { ChromaKeyColor } from "./lot-line-chroma-key.ts";
import {
  applyEdgeConnectedChromaKeyToAlpha,
  deriveBackgroundKeyFromCorners,
  detectNativeTransparencyUsable,
} from "./lot-line-chroma-key.ts";
import { stripRemainingBakedCheckerboardPixels } from "./lot-line-gelato-back-clean-asset.ts";

/** Canonical flat key for v43 autonomous print art (matches controlled-batch reliability). */
export const V43_AUTONOMOUS_CHROMA_KEY: ChromaKeyColor = {
  name: "CHROMA_MAGENTA",
  r: 255,
  g: 0,
  b: 255,
};

export async function postProcessClubThrottleProviderRaster(input: {
  rawPath: string;
  keyColor?: ChromaKeyColor;
  processedPath: string;
}): Promise<{ used_native_alpha: boolean; key_used: ChromaKeyColor }> {
  const fallbackKey = input.keyColor ?? V43_AUTONOMOUS_CHROMA_KEY;
  let working = readFileSync(input.rawPath);
  const native = await detectNativeTransparencyUsable(input.rawPath);
  const usedNative = native.mode === "NATIVE_ALPHA";
  let keyUsed = fallbackKey;
  if (!usedNative) {
    const cornerKey = await deriveBackgroundKeyFromCorners(input.rawPath);
    keyUsed = cornerKey ?? fallbackKey;
    working = Buffer.from(await applyEdgeConnectedChromaKeyToAlpha(working, keyUsed));
  }
  working = Buffer.from(await stripRemainingBakedCheckerboardPixels(working));
  writeFileSync(input.processedPath, working);
  return { used_native_alpha: usedNative, key_used: keyUsed };
}
