import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("SERVERLESS_READ_ONLY_FILESYSTEM_PERSISTENCE_V1", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.VERCEL = "1";
    delete process.env.INFINITY_HQ_SURFACE;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("saveValidationQueue does not mkdir/write when durableLocalPersistEnabled is false", async () => {
    const { saveValidationQueue } = await import("../venture-candidate-validation-queue-v1.ts");
    const cwd = mkdtempSync(join(tmpdir(), "vq-serverless-"));
    const queuePath = join(cwd, ".infinity/venture-discovery/venture-candidate-validation-queue-v1.json");

    try {
      saveValidationQueue(
        {
          version: "VENTURE_CANDIDATE_VALIDATION_QUEUE_V1",
          updated_at: new Date().toISOString(),
          organization_id: "org-test",
          source_selection_run_id: null,
          entries: [],
          due_for_revalidation_count: 0,
          VENTURE_VALIDATE_STATE_MACHINE_QC: "PASS",
        },
        cwd,
      );

      expect(existsSync(queuePath)).toBe(false);
      expect(existsSync(join(cwd, ".infinity/venture-discovery"))).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("saveValidationQueue writes locally when durable persistence is enabled", async () => {
    delete process.env.VERCEL;
    const { saveValidationQueue, loadValidationQueue } = await import(
      "../venture-candidate-validation-queue-v1.ts"
    );
    const cwd = mkdtempSync(join(tmpdir(), "vq-durable-"));

    try {
      saveValidationQueue(
        {
          version: "VENTURE_CANDIDATE_VALIDATION_QUEUE_V1",
          updated_at: new Date().toISOString(),
          organization_id: "org-test",
          source_selection_run_id: null,
          entries: [],
          due_for_revalidation_count: 0,
          VENTURE_VALIDATE_STATE_MACHINE_QC: "PASS",
        },
        cwd,
      );
      expect(loadValidationQueue(cwd)?.organization_id).toBe("org-test");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
