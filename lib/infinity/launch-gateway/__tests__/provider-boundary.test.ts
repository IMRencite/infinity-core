import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..", "..");
const workersRoot = join(repoRoot, "lib", "infinity", "workers");
const forbiddenImport = /launch-gateway\/adapters\/(github|vercel|mock-provider)/;

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("Provider network boundary", () => {
  it("workers do not import provider adapters directly", () => {
    const violations: string[] = [];
    for (const file of walkTsFiles(workersRoot)) {
      if (file.includes("launch-gateway-handlers")) continue;
      const content = readFileSync(file, "utf8");
      if (forbiddenImport.test(content)) {
        violations.push(file.replace(repoRoot, ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
