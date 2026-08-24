import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteNode = join(root, "node_modules/vite-node/vite-node.mjs");
const entry = join(root, "scripts/preflight-vercel-live-verification.ts");
const config = join(root, "vitest.config.ts");
const result = spawnSync(process.execPath, [viteNode, "-c", config, entry, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
