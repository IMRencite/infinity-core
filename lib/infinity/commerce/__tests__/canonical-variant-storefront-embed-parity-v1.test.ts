import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_VARIANT_IDENTITY_V1_STOREFRONT_SOURCE } from "../canonical-variant-identity-v1.storefront-embed.ts";

describe("canonical variant storefront embed parity v1", () => {
  it("CANONICAL_VARIANT_SINGLE_SOURCE_OF_TRUTH_QC — embed matches canonical source file", () => {
    const source = readFileSync(join(process.cwd(), "lib/infinity/commerce/canonical-variant-identity-v1.ts"), "utf8");
    expect(CANONICAL_VARIANT_IDENTITY_V1_STOREFRONT_SOURCE).toBe(source);
  });
});
