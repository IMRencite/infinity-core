import { BROWSER_CONSOLE_QC_GATE, type ConsoleEntry, type NamedGate } from "./contract";

const BENIGN_PATTERNS = [
  /chrome-extension:/i,
  /moz-extension:/i,
  /safari-extension:/i,
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /Fast Refresh/i,
];

const MATERIAL_PATTERNS = [
  /Failed to fetch/i,
  /fetchServerResponse/i,
  /fetchMissingDynamicData/i,
  /Uncaught TypeError/i,
  /Uncaught ReferenceError/i,
  /Unhandled (Promise )?Rejection/i,
  /Hydration failed/i,
  /Minified React error/i,
  /Can't resolve 'tls'/i,
];

export function classifyConsoleEntry(text: string): ConsoleEntry {
  if (BENIGN_PATTERNS.some((pattern) => pattern.test(text))) {
    return { text, classification: "BENIGN_EXTERNAL", reason: "BROWSER_EXTENSION_OR_DEV_NOISE" };
  }
  if (MATERIAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return { text, classification: "MATERIAL", reason: "MATERIAL_RUNTIME_FAILURE" };
  }
  if (/warning/i.test(text)) {
    return { text, classification: "ACTIONABLE_WARNING", reason: "NON_FATAL_WARNING" };
  }
  return { text, classification: "ACTIONABLE_WARNING", reason: "UNCLASSIFIED_CONSOLE_ENTRY" };
}

export function evaluateBrowserConsoleQCGate(entries: readonly string[]): NamedGate & {
  material: ConsoleEntry[];
  classified: ConsoleEntry[];
} {
  const classified = entries.map(classifyConsoleEntry);
  const material = classified.filter((entry) => entry.classification === "MATERIAL");
  return {
    gate: BROWSER_CONSOLE_QC_GATE,
    result: material.length === 0 ? "PASS" : "FAIL",
    reasons: material.map((entry) => `MATERIAL:${entry.reason}`),
    material,
    classified,
  };
}
