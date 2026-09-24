import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const dest = join(tmpdir(), "infinity-organic-isolated-v28");
const files = [
  "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution.ts",
  "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-live-publisher.ts",
  "lib/infinity/organic-growth-engine/continuous/occupancynpv-organic-publish-adapter.ts",
];
for (const file of files) {
  const to = join(dest, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(join(process.cwd(), file)));
}
const execution = readFileSync(join(dest, files[0]), "utf8");
const out = { dest, patched: files, catch_publish_throw: /PUBLISH_THREW/.test(execution) };
writeFileSync(join(process.cwd(), ".infinity/blog-os/v54-organic-dest-patch.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
if (!out.catch_publish_throw) process.exit(1);
