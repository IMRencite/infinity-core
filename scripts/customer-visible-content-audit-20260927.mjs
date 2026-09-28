#!/usr/bin/env node
/**
 * Customer-visible content audit — runs composed-render recovery tests.
 * Usage: node scripts/customer-visible-content-audit-20260927.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "vitest",
    "run",
    "lib/infinity/organic-growth-engine/continuous/__tests__/customer-visible-content-recovery.test.ts",
    "--reporter=verbose",
  ],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
