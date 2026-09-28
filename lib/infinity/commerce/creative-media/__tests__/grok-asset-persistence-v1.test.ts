import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertCreativeGenerationComplete,
  persistCreativeProviderImage,
  type CreativeCandidateRecord,
} from "../grok-apparel-persistence";

describe("grok apparel asset persistence", () => {
  it("blocks COMPLETE when persistence fails", () => {
    const record: CreativeCandidateRecord = {
      candidate_id: "neon-city-run-1",
      direction_id: "neon-city-run",
      variant_index: 1,
      provider: "xai",
      model: "grok-imagine-image-2.0",
      generation_state: "GENERATED_NOT_PERSISTED",
      content_hash: null,
      asset_path: null,
      replay_of: null,
    };
    expect(() => assertCreativeGenerationComplete(record)).toThrow(/GENERATED_NOT_PERSISTED/);
  });

  it("marks COMPLETE when persistence and reopen succeed", () => {
    const b64 = Buffer.from("fake-png-bytes-for-test").toString("base64");
    const persisted = persistCreativeProviderImage({
      candidate_id: "gas-station-after-hours-1",
      direction_id: "gas-station-after-hours",
      variant_index: 1,
      b64,
      rootDir: process.cwd(),
      testRoot: ".infinity/test-grok-persist",
    });
    expect(persisted.generation_state).toBe("COMPLETE");
    expect(persisted.content_hash).toBe(createHash("sha256").update(Buffer.from(b64, "base64")).digest("hex"));
    expect(persisted.asset_path).toMatch(/gas-station-after-hours-1\.png$/);
  });
});
