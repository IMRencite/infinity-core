import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const destRoot = join(process.cwd(), "..", "imros-public-deploy");
const files = [
  "components/public/operations-room",
  "components/public/legal",
  "app/public/privacy/page.tsx",
  "app/public/terms/page.tsx",
  "app/public/operations-room/page.tsx",
  "app/api/public/operations/route.ts",
  "lib/infinity/public-operations-projection/types.ts",
  "lib/infinity/public-operations-projection/sanitize.ts",
  "lib/infinity/public-operations-projection/project.ts",
  "lib/infinity/public-operations-projection/registry.ts",
  "lib/infinity/public-operations-projection/visibility.ts",
  "lib/infinity/public-operations-projection/recent-public-ventures.ts",
  "lib/infinity/public-operations-projection/canonical-public-venture-feed.ts",
  "lib/infinity/public-operations-projection/gates.ts",
  "lib/infinity/public-operations-projection/cache.ts",
  "lib/infinity/public-operations-room/imros-founder-qa-state.ts",
  "lib/infinity/public-operations-projection/occupancy.ts",
  "lib/infinity/public-operations-projection/derive-occupancy.ts",
  "lib/infinity/public-operations-projection/persist-occupancy.ts",
  "lib/infinity/public-operations-projection/publish-occupancy.ts",
  "lib/infinity/public-operations-projection/index.ts",
  "lib/infinity/public-operations-room/contract.ts",
  "lib/infinity/public-operations-room/format.ts",
  "lib/infinity/public-operations-room/gates.ts",
  "lib/infinity/public-operations-room/visual-gates.ts",
  "lib/infinity/public-operations-room/index.ts",
  "lib/infinity/public-operations-room/__tests__/public-operations-state-parity-v1.test.ts",
  "lib/infinity/public-operations-room/__tests__/public-homepage-operations-v1.test.ts",
  "lib/infinity/public-legal",
  "public/brand/infinity-os-logo.png",
  "public/brand/infinity-os-logo.symbol-reference.png",
  "public/brand/imr-mark.png",
  "lib/infinity/hq-production-deployment/contract.ts",
  "lib/infinity/public-venture-design/production-post-deploy-live-gate.ts",
  "lib/infinity/public-venture-design/transparent-asset-integrity.ts",
  "lib/infinity/public-venture-design/venture-brand-presentation-contract.ts",
  "lib/infinity/public-venture-design/brand-asset-contrast-gate.ts",
  "lib/infinity/public-venture-design/brand-color-integrity-gate.ts",
  "lib/infinity/build-factory/venture-production-qc-enforcement.ts",
  "lib/infinity/public-venture-design/venture-visual-contract.ts",
  "lib/infinity/public-venture-design/venture-rendered-quality-gates.ts",
  "lib/infinity/public-venture-design/rendered-scroll-collision-gate.ts",
  "lib/infinity/public-venture-design/venture-stacking-layers.ts",
  "lib/infinity/build-factory/venture-launch-qc-contract.ts",
];

if (!existsSync(destRoot)) {
  console.log(JSON.stringify({ ok: false, reason: "IMROS_PUBLIC_DEPLOY_MISSING", destRoot }));
  process.exit(1);
}

for (const rel of files) {
  const from = join(process.cwd(), rel);
  const to = join(destRoot, rel);
  if (!existsSync(from)) continue;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

const imrosSources = join(process.cwd(), "lib/infinity/public-operations-projection/sources.imros-public.ts");
const imrosSourcesDest = join(destRoot, "lib/infinity/public-operations-projection/sources.ts");
if (existsSync(imrosSources)) {
  mkdirSync(dirname(imrosSourcesDest), { recursive: true });
  writeFileSync(imrosSourcesDest, readFileSync(imrosSources, "utf8"));
}

console.log(JSON.stringify({ ok: true, destRoot, copied: files.length + 1 }));
