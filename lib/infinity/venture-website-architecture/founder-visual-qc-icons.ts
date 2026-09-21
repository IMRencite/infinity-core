export const SEMANTIC_ICON_ROLES = [
  "question",
  "compare",
  "topic",
  "cost",
  "role",
  "tool",
  "deeper",
  "chart",
  "document",
  "workflow",
] as const;

export type SemanticIconRole = (typeof SEMANTIC_ICON_ROLES)[number];

/** Coherent filled 24px family. Presence of a wrapper is not enough — each path must render a glyph. */
export const SEMANTIC_ICON_PATHS: Record<SemanticIconRole, string> = {
  question:
    "M10.5 16.5h3v3h-3zm1.5-14A5.5 5.5 0 0 1 17.5 8c0 2.8-2.1 3.7-3.4 4.6S12.5 14.4 12.5 16h-3c0-2.7.9-3.6 2.3-4.6S16 10.2 16 8a3.5 3.5 0 1 0-7 0H6A5.5 5.5 0 0 1 12 2.5z",
  compare: "M4 5h7v2H4zm0 4h7v2H4zm0 4h5v2H4zM15 4h2l3 3v13H13V4zm2 1.8V8h2.2z",
  topic: "M4 5h16v3H4zm0 5.5h16v3H4zM4 16h11v3H4z",
  cost: "M12 3.2A8.8 8.8 0 1 0 20.8 12 8.8 8.8 0 0 0 12 3.2zm.7 13.3h-1.4v-1a3.8 3.8 0 0 1-2.4-1.1l1-1.2a2.6 2.6 0 0 0 1.9.9c.7 0 1.2-.3 1.2-.9s-.6-.8-1.9-1.2-2.6-.8-2.6-2.3 1-2.3 2.4-2.5V6.8h1.4v1a3.4 3.4 0 0 1 2 1l-1 1.2a2.2 2.2 0 0 0-1.6-.7c-.6 0-1 .3-1 1s.6.7 2 1.2 2.6 1 2.6 2.4-1.1 2.4-2.6 2.6z",
  role: "M12 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-4.2 0-8 2-8 4.5V21h16v-3.5C20 15 16.2 13 12 13z",
  tool: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 3h7v4h-7z",
  deeper: "M11 3h2v10h3l-4 5-4-5h3zM5 20h14v2H5z",
  chart: "M4 19V10h3.2V19zm6.4 0V5h3.2v14zm6.4 0v-7H20v7zM3 20h18v2H3z",
  document: "M7 2h8l4 4v16H7zm8 1.6V7h3.4z",
  workflow: "M4 4h6v5H4zm10 6h6v5h-6zM4 15h6v5H4zM10 6.5h4v2h-4zM10 17.5h4v2h-4z",
};

export const REJECTED_CIRCLE_ONLY_ICON = "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z";
export const REJECTED_PAUSE_COMPARE_ICON = "M7 4h3v16H7zm7 4h3v12h-3z";
export const REJECTED_HEAD_ONLY_ROLE_ICON = "M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12z";
export const LEGACY_TOPIC_ICON = "M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z";
export const LEGACY_TOOL_ICON = "M4 6h7v5H4zm9 0h7v12h-7zM4 13h7v5H4z";
export const LEGACY_DEEPER_ICON = "M12 4v12M8 12l4 4 4-4M5 19h14";

export function resolveSemanticIconPath(role: string): string {
  return SEMANTIC_ICON_PATHS[(role as SemanticIconRole)] ?? SEMANTIC_ICON_PATHS.question;
}

export function replaceLegacySemanticIconPaths(source: string): string {
  return source
    .replaceAll(REJECTED_PAUSE_COMPARE_ICON, SEMANTIC_ICON_PATHS.compare)
    .replaceAll(REJECTED_CIRCLE_ONLY_ICON, SEMANTIC_ICON_PATHS.question)
    .replaceAll(REJECTED_HEAD_ONLY_ROLE_ICON, SEMANTIC_ICON_PATHS.role)
    .replaceAll(LEGACY_TOPIC_ICON, SEMANTIC_ICON_PATHS.topic)
    .replaceAll(LEGACY_TOOL_ICON, SEMANTIC_ICON_PATHS.tool)
    .replaceAll(LEGACY_DEEPER_ICON, SEMANTIC_ICON_PATHS.deeper)
    .replaceAll("M12 4v12m0 0-4-4m4 4 4-4M5 19h14", SEMANTIC_ICON_PATHS.deeper);
}
