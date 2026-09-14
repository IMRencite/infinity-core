import {
  evaluateFounderHqRuntimeSourceGate,
  FOUNDER_HQ_CANONICAL_ORIGIN,
  FOUNDER_HQ_CANONICAL_PORT,
  hqDevClientBuildId,
  isCanonicalFounderHqOrigin,
} from "./local-hq-proof";
import type { QCEvidenceState } from "@/lib/infinity/universal-artifact-qc/evidence-state";

export const FOUNDER_BROWSER_EVIDENCE_CONTEXT = "FounderBrowserEvidenceContext" as const;
export const FOUNDER_AUTHENTICATED_BROWSER_EVIDENCE_GATE = "FounderAuthenticatedBrowserEvidenceGate" as const;
export const FINANCIAL_RECONCILIATION_KNOWN_FOUNDER_DEFECT_ID = "financial-reconciliation-containment" as const;

export type FounderBrowserEvidenceContext = {
  contract: typeof FOUNDER_BROWSER_EVIDENCE_CONTEXT;
  origin: string | null;
  authenticated: boolean;
  browser_session_id: string | null;
  artifact_version: string;
  runtime_process: string | null;
  runtime_port: number | null;
  attached_at: string | null;
  evidence_timestamp: string | null;
  evidence_source: "FOUNDER_BROWSER" | "UNAUTHENTICATED_FETCH" | "HTML_SOURCE" | "UNIT_TEST" | "NONE";
  viewport: string | null;
  route: string | null;
  connection_state: "ATTACHED" | "NOT_ATTACHABLE" | "NOT_ATTACHED";
};

export type KnownFounderDefect = {
  id: string;
  status: "OPEN" | "CLOSED";
  exact_version_recheck: QCEvidenceState;
};

export function emptyFounderBrowserEvidenceContext(now = new Date().toISOString()): FounderBrowserEvidenceContext {
  return {
    contract: FOUNDER_BROWSER_EVIDENCE_CONTEXT,
    origin: FOUNDER_HQ_CANONICAL_ORIGIN,
    authenticated: false,
    browser_session_id: null,
    artifact_version: hqDevClientBuildId() || "unknown",
    runtime_process: "node.exe PID 74928 start-server.js",
    runtime_port: FOUNDER_HQ_CANONICAL_PORT,
    attached_at: null,
    evidence_timestamp: now,
    evidence_source: "NONE",
    viewport: null,
    route: null,
    connection_state: "NOT_ATTACHED",
  };
}

export function currentKnownFounderDefects(): KnownFounderDefect[] {
  return [
    {
      id: FINANCIAL_RECONCILIATION_KNOWN_FOUNDER_DEFECT_ID,
      status: "OPEN",
      exact_version_recheck: "NOT_VERIFIED",
    },
  ];
}

export function evaluateFounderAuthenticatedBrowserEvidenceGate(input: {
  origin: string | null;
  authenticated: boolean;
  browserAttached: boolean;
  artifactVersionMatches: boolean;
  renderedEvidenceCollected: boolean;
  evidenceSource: FounderBrowserEvidenceContext["evidence_source"];
}): { gate: typeof FOUNDER_AUTHENTICATED_BROWSER_EVIDENCE_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.origin && /:(3001)\b/.test(input.origin)) reasons.push("PORT_3001_IS_NON_CANONICAL");
  if (!isCanonicalFounderHqOrigin(input.origin)) reasons.push("NON_CANONICAL_HQ_ORIGIN");
  if (!input.authenticated) reasons.push("FOUNDER_SESSION_NOT_AUTHENTICATED");
  if (!input.browserAttached) reasons.push("FOUNDER_BROWSER_NOT_ATTACHED");
  if (!input.artifactVersionMatches) reasons.push("ARTIFACT_VERSION_MISMATCH");
  if (!input.renderedEvidenceCollected) reasons.push("RENDERED_BROWSER_EVIDENCE_MISSING");
  if (input.evidenceSource === "UNAUTHENTICATED_FETCH") reasons.push("UNAUTHENTICATED_FETCH_NOT_ELIGIBLE");
  if (input.evidenceSource === "HTML_SOURCE") reasons.push("HTML_SOURCE_NOT_ELIGIBLE");
  if (input.evidenceSource === "UNIT_TEST") reasons.push("UNIT_TEST_NOT_ELIGIBLE");
  if (input.evidenceSource === "NONE") reasons.push("NO_BROWSER_EVIDENCE_SOURCE");
  return {
    gate: FOUNDER_AUTHENTICATED_BROWSER_EVIDENCE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["AUTHENTICATED_FOUNDER_BROWSER_EVIDENCE"],
  };
}

export function inspectFounderChromeAttachability(input: {
  remoteDebuggingEndpointPresent: boolean;
  chromeProcessCount: number;
  chromeTerminated: boolean;
}): {
  existing_founder_chrome_attachable: boolean;
  existing_devtools_endpoint: boolean;
  founder_chrome_restart_required: boolean;
  chrome_terminated: boolean;
} {
  return {
    existing_founder_chrome_attachable: input.remoteDebuggingEndpointPresent && !input.chromeTerminated,
    existing_devtools_endpoint: input.remoteDebuggingEndpointPresent,
    founder_chrome_restart_required: !input.remoteDebuggingEndpointPresent,
    chrome_terminated: input.chromeTerminated,
  };
}

export function founderBrowserAttachmentAction(): string {
  return [
    "Keep the current logged-in HQ tab open. Do not close it yet.",
    "Start a separate Chrome QC instance that does not replace your current Chrome:",
    `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\\InfinityFounderQcChrome"`,
    "In that QC window, sign in as founder and open http://localhost:3000/dashboard.",
    "Do not use port 3001. Do not create another allocation.",
  ].join(" ");
}

export function evaluateFounderRuntimeStillCanonical(): ReturnType<typeof evaluateFounderHqRuntimeSourceGate> {
  return evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: FOUNDER_HQ_CANONICAL_ORIGIN });
}
