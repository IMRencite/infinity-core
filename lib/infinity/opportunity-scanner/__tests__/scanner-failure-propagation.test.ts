import { describe, it, expect } from "vitest";
import { classifyScannerFailure } from "../failures";
import { extractThrownMessage } from "@/lib/infinity/shared/extract-thrown-message";

describe("scanner failure propagation", () => {
  it("preserves Supabase PostgREST error objects instead of Unknown scanner failure", () => {
    const postgrestError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (organization_id, dedup_key)=(...) already exists.",
      hint: null,
    };

    expect(extractThrownMessage(postgrestError)).toContain("23505");
    expect(extractThrownMessage(postgrestError)).toContain("duplicate key");

    const classified = classifyScannerFailure(postgrestError);
    expect(classified.message).not.toBe("Unknown scanner failure.");
    expect(classified.classification).toBe("persistence_failure");
    expect(classified.errorCode).toBe("23505");
  });

  it("maps PGRST002 to infrastructure_blocked", () => {
    const classified = classifyScannerFailure({
      code: "PGRST002",
      message: "Could not query the database for the schema cache. Retrying.",
    });
    expect(classified.classification).toBe("infrastructure_blocked");
    expect(classified.message).toContain("PGRST002");
  });

  it("preserves Error instances", () => {
    const classified = classifyScannerFailure(new Error("Strategy extraction timed out after 120000ms"));
    expect(classified.classification).toBe("timeout");
    expect(classified.message).toContain("timed out");
  });
});
