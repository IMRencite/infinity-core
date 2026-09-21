import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Vercel / HQ production lambdas have no durable writable local `.infinity/` tree. */
export function isServerlessEphemeralFilesystem(): boolean {
  return process.env.VERCEL === "1" || process.env.INFINITY_HQ_SURFACE === "1";
}

export function durableLocalPersistEnabled(): boolean {
  if (isServerlessEphemeralFilesystem()) return false;
  return true;
}

export function writeLocalJsonIfDurable(path: string, value: unknown): "WRITTEN" | "SKIPPED_EPHEMERAL" | "UNAVAILABLE" {
  if (!durableLocalPersistEnabled()) return "SKIPPED_EPHEMERAL";
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    return "WRITTEN";
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "WRITE_FAILED";
    console.error("[hq-persist] local_fs_unavailable", { path_kind: dirname(path), code });
    return "UNAVAILABLE";
  }
}
