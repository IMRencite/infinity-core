import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { digestOfAuthorityFiles } from "../lib/infinity/venture-website-architecture/cre-successor.ts";

const SKIP = new Set(["node_modules", ".next", ".npm-cache", ".git"]);
const roots = process.argv.slice(2);

async function walk(dir: string, rel = ""): Promise<Array<{ path: string; content: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: Array<{ path: string; content: string }> = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const relative = rel ? `${rel}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, relative)));
      continue;
    }
    const info = await stat(full);
    if (info.size > 2_000_000) continue;
    files.push({ path: relative.replace(/\\/g, "/"), content: await readFile(full, "utf8") });
  }
  return files;
}

for (const root of roots) {
  const files = await walk(root);
  process.stdout.write(`${root}\t${files.length}\t${digestOfAuthorityFiles(files)}\n`);
}
