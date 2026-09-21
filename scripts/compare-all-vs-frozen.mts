import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";

const SKIP = new Set(["node_modules", ".next", ".npm-cache", ".git"]);
const frozenRoot = `${process.env.TEMP}\\infinity-isolated-artifact-7jCjbe`;

async function walk(dir: string, rel = ""): Promise<Map<string, string>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = new Map<string, string>();
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const relative = (rel ? `${rel}/${entry.name}` : entry.name).replace(/\\/g, "/");
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [key, value] of await walk(full, relative)) files.set(key, value);
      continue;
    }
    const info = await stat(full);
    if (info.size > 2_000_000) continue;
    files.set(relative, await readFile(full, "utf8"));
  }
  return files;
}

const hash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const search = await reconstructCreSearchDepthSuccessor();
const live = new Map(search.files.filter((file) => file.encoding !== "base64").map((file) => [file.path.replace(/\\/g, "/"), file.content]));
const frozen = await walk(frozenRoot);
const diffs: string[] = [];
for (const [rel, content] of live) {
  const other = frozen.get(rel);
  if (other == null) {
    diffs.push(`ONLY_LIVE\t${rel}\t${content.length}`);
    continue;
  }
  if (other !== content) diffs.push(`DIFF\t${rel}\tlive=${hash(content)}\tfrozen=${hash(other)}\tliveLen=${content.length}\tfrozenLen=${other.length}`);
}
for (const rel of frozen.keys()) {
  if (!live.has(rel) && !rel.endsWith("package-lock.json") && rel !== "next-env.d.ts") {
    diffs.push(`ONLY_FROZEN\t${rel}\t${frozen.get(rel)?.length ?? 0}`);
  }
}
process.stdout.write(`liveFiles=${live.size} frozenFiles=${frozen.size} diffs=${diffs.length}\n`);
process.stdout.write(`${diffs.slice(0, 80).join("\n")}\n`);
process.stdout.write(`cssPaths=${[...live.keys()].filter((item) => item.endsWith(".css")).join(",")}\n`);
