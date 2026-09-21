import { cpSync, existsSync, mkdirSync } from "node:fs";
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
  "lib/infinity/public-operations-projection/cache.ts",
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

console.log(JSON.stringify({ ok: true, destRoot, copied: files.length }));
