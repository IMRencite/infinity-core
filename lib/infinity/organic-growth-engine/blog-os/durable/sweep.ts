import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MARKER = /vg-cta|pv-cta-panel/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|css)$/.test(name)) acc.push(full);
  }
  return acc;
}

export function countPagesUsingSharedCta(root = process.cwd()): {
  pages_using_component: number;
  files: string[];
  sampling_policy: string;
} {
  const dirs = [
    join(root, "lib/infinity/organic-growth-engine/continuous"),
    join(root, ".infinity/tmp-occupancynpv-blog-build/app"),
  ];
  const files: string[] = [];
  for (const dir of dirs) {
    try {
      for (const file of walk(dir)) {
        if (MARKER.test(readFileSync(file, "utf8"))) files.push(file.replace(/\\/g, "/"));
      }
    } catch {
      // missing optional build tree
    }
  }
  return {
    pages_using_component: files.length,
    files,
    sampling_policy: "bounded: lease-comparison + blog article layouts; desktop/tablet/mobile not captured unless screenshots exist",
  };
}
