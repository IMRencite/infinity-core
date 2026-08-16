export const CODING_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          operation: { type: "string", enum: ["CREATE", "PATCH"] },
          content: { type: "string" },
        },
        required: ["path", "operation", "content"],
      },
    },
    summary: { type: "string" },
  },
  required: ["files", "summary"],
} as const;

export type CodingFileOperation = {
  path: string;
  operation: "CREATE" | "PATCH";
  content: string;
};

export type CodingTaskOutput = {
  files: CodingFileOperation[];
  summary: string;
  confidence?: number;
  tests?: string[];
};

export type ReviewOutput = {
  defects: Array<{
    defectType: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    filePath?: string;
  }>;
  pointsOfAgreement: string[];
  pointsOfDisagreement: string[];
  recommendation: string;
  confidence: number;
};

export const REVIEW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    defects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          defectType: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          description: { type: "string" },
        },
        required: ["defectType", "severity", "description"],
      },
    },
    pointsOfAgreement: { type: "array", items: { type: "string" } },
    pointsOfDisagreement: { type: "array", items: { type: "string" } },
    recommendation: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["defects", "pointsOfAgreement", "pointsOfDisagreement", "recommendation", "confidence"],
} as const;

export function parseCodingOutput(raw: string): CodingTaskOutput {
  const parsed = JSON.parse(raw) as CodingTaskOutput;
  if (!Array.isArray(parsed.files)) {
    throw new Error("Coding output missing files array");
  }
  for (const file of parsed.files) {
    if (file.path.includes("..") || file.path.startsWith("/")) {
      throw new Error(`Invalid file path in coding output: ${file.path}`);
    }
  }
  return parsed;
}

export function parseReviewOutput(raw: string): ReviewOutput {
  return JSON.parse(raw) as ReviewOutput;
}

export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/sk-ant-[a-zA-Z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/xai-[a-zA-Z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/ghp_[a-zA-Z0-9]{10,}/g, "[REDACTED]")
    .replace(/AQ\.[a-zA-Z0-9._-]{10,}/g, "[REDACTED]");
}
