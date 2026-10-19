import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(repoRoot, "lib/infinity/commerce/canonical-variant-identity-v1.ts");
const outPath = join(repoRoot, "lib/infinity/commerce/canonical-variant-identity-v1.storefront-embed.ts");
const source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
writeFileSync(
  outPath,
  `/** GENERATED — run scripts/sync-canonical-variant-storefront-embed.mjs. Source: canonical-variant-identity-v1.ts */\nexport const CANONICAL_VARIANT_IDENTITY_V1_STOREFRONT_SOURCE = ${JSON.stringify(source)};\n`,
);
