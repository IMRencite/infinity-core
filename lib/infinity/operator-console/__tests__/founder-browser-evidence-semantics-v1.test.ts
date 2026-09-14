import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { evaluateNoQCNoReleaseGate } from "@/lib/infinity/universal-artifact-qc/gates";
import {
  aggregateQcLayer,
  evidenceStateBlocksRelease,
  missingEvidenceIsNotFail,
  type QcSurfaceEvidence,
} from "@/lib/infinity/universal-artifact-qc/evidence-state";
import { evaluateFounderHqRuntimeSourceGate } from "../local-hq-proof";
import {
  currentKnownFounderDefects,
  emptyFounderBrowserEvidenceContext,
  evaluateFounderAuthenticatedBrowserEvidenceGate,
  FINANCIAL_RECONCILIATION_KNOWN_FOUNDER_DEFECT_ID,
  inspectFounderChromeAttachability,
} from "../founder-browser-evidence";

describe("founder browser attachment + QC evidence semantics v1", () => {
  it("1-2: port 3000 accepted, port 3001 rejected", () => {
    expect(evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: "http://localhost:3000" }).result).toBe("PASS");
    expect(evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: "http://localhost:3001" }).result).toBe("FAIL");
  });

  it("3-4: unauthenticated fetch and HTML source cannot satisfy founder-browser gate", () => {
    const fetchGate = evaluateFounderAuthenticatedBrowserEvidenceGate({
      origin: "http://localhost:3000",
      authenticated: false,
      browserAttached: false,
      artifactVersionMatches: true,
      renderedEvidenceCollected: false,
      evidenceSource: "UNAUTHENTICATED_FETCH",
    });
    const htmlGate = evaluateFounderAuthenticatedBrowserEvidenceGate({
      origin: "http://localhost:3000",
      authenticated: false,
      browserAttached: false,
      artifactVersionMatches: true,
      renderedEvidenceCollected: false,
      evidenceSource: "HTML_SOURCE",
    });
    expect(fetchGate.result).toBe("FAIL");
    expect(fetchGate.reasons).toContain("UNAUTHENTICATED_FETCH_NOT_ELIGIBLE");
    expect(htmlGate.result).toBe("FAIL");
    expect(htmlGate.reasons).toContain("HTML_SOURCE_NOT_ELIGIBLE");
  });

  it("5-6: NOT_VERIFIED is not FAIL; BLOCKED cannot become PASS", () => {
    const unverified: QcSurfaceEvidence[] = [{ surface: "Hosting", state: "NOT_VERIFIED", reasons: ["BROWSER_NOT_ATTACHED"] }];
    const blocked: QcSurfaceEvidence[] = [{ surface: "Rendered", state: "BLOCKED", reasons: ["FOUNDER_BROWSER_UNAVAILABLE"] }];
    expect(aggregateQcLayer(unverified)).toBe("NOT_VERIFIED");
    expect(missingEvidenceIsNotFail("NOT_VERIFIED")).toBe(true);
    expect(aggregateQcLayer(blocked)).toBe("BLOCKED");
    expect(aggregateQcLayer(blocked)).not.toBe("PASS");
    expect(aggregateQcLayer(blocked)).not.toBe("FAIL");
  });

  it("7-8: missing browser evidence blocks release; observed defect is FAIL", () => {
    expect(evidenceStateBlocksRelease("NOT_VERIFIED")).toBe(true);
    expect(evidenceStateBlocksRelease("BLOCKED")).toBe(true);
    expect(
      evaluateNoQCNoReleaseGate({
        qc_status: "QC_PENDING_BROWSER_PROOF",
        lifecycle_state: "QC_PENDING",
        release_requested: true,
      }).result,
    ).toBe("FAIL");
    expect(aggregateQcLayer([{ surface: "Financial Reconciliation", state: "FAIL", reasons: ["OVERFLOW"] }])).toBe("FAIL");
  });

  it("9-10: prior founder defect stays open until fresh pass; evidence tied to artifact version", () => {
    const defects = currentKnownFounderDefects();
    const overflow = defects.find((row) => row.id === FINANCIAL_RECONCILIATION_KNOWN_FOUNDER_DEFECT_ID);
    expect(overflow?.status).toBe("OPEN");
    expect(overflow?.exact_version_recheck).toBe("NOT_VERIFIED");
    const context = emptyFounderBrowserEvidenceContext();
    expect(context.artifact_version.length).toBeGreaterThan(0);
    expect(context.evidence_source).toBe("NONE");
    expect(JSON.stringify(context)).not.toMatch(/password|api_key|access_token|cookie|authorization/i);
  });

  it("11-12: authentication is not bypassed and context stores no credentials", () => {
    const gate = evaluateFounderAuthenticatedBrowserEvidenceGate({
      origin: "http://localhost:3000",
      authenticated: false,
      browserAttached: true,
      artifactVersionMatches: true,
      renderedEvidenceCollected: true,
      evidenceSource: "FOUNDER_BROWSER",
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("FOUNDER_SESSION_NOT_AUTHENTICATED");
    expect(readFileSync(join(process.cwd(), "lib/infinity/operator-console/founder-browser-evidence.ts"), "utf8")).not.toMatch(
      /bypass login|forge session|disable auth/i,
    );
  });

  it("13-15: $25 allocation untouched, Chrome not terminated, no 3001 evidence", () => {
    const ledger = JSON.parse(
      readFileSync(join(process.cwd(), ".infinity/financial-truth/capital-ledger.json"), "utf8"),
    ) as { allocations: Array<{ venture_id: string; allocated_amount: number }> };
    const occupancy = ledger.allocations.find((row) => row.venture_id === CRE_VENTURE_ID);
    expect(occupancy?.allocated_amount).toBe(25);
    const attach = inspectFounderChromeAttachability({
      remoteDebuggingEndpointPresent: false,
      chromeProcessCount: 64,
      chromeTerminated: false,
    });
    expect(attach.chrome_terminated).toBe(false);
    expect(attach.existing_founder_chrome_attachable).toBe(false);
    expect(evaluateFounderAuthenticatedBrowserEvidenceGate({
      origin: "http://localhost:3001/dashboard",
      authenticated: true,
      browserAttached: true,
      artifactVersionMatches: true,
      renderedEvidenceCollected: true,
      evidenceSource: "FOUNDER_BROWSER",
    }).reasons).toContain("PORT_3001_IS_NON_CANONICAL");
  });
});
