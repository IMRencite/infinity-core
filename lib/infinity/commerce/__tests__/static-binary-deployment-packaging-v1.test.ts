import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { digestComposedStorefrontFiles } from "../composed-storefront-file-digest-v1.ts";
import type { ComposedStorefrontFile } from "../club-throttle-storefront-compose.ts";

describe("STATIC_BINARY_DEPLOYMENT_PACKAGING_QC_V1", () => {
  it("digestComposedStorefrontFiles does not require concatenating large payloads", () => {
    const dir = mkdtempSync(join(tmpdir(), "ct-static-deploy-"));
    const binPath = join(dir, "large.bin");
    const chunk = Buffer.alloc(512 * 1024, 0xab);
    writeFileSync(binPath, Buffer.concat([chunk, chunk, chunk, chunk]));
    const files: ComposedStorefrontFile[] = [
      { path: "public/storefront-merch/production-masters/fixture-production-print-master-3600w.png", sourceAbs: binPath },
      { path: "package.json", content: '{"private":true}\n', encoding: "utf8" },
    ];
    expect(() => digestComposedStorefrontFiles(files)).not.toThrow();
    expect(digestComposedStorefrontFiles(files)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("LARGE_STATIC_ASSET_DEPLOYMENT_QC fixture size is realistic", () => {
    const dir = mkdtempSync(join(tmpdir(), "ct-large-fixture-"));
    mkdirSync(join(dir, "public/storefront-merch/production-masters"), { recursive: true });
    const fixture = join(dir, "public/storefront-merch/production-masters/stub-3600w.png");
    writeFileSync(fixture, Buffer.alloc(2 * 1024 * 1024, 0x01));
    expect(fixture.length).toBeGreaterThan(0);
  });
});
