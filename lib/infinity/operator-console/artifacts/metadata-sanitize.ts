const ALLOWED_METADATA_KEYS = new Set([
  "score",
  "rank",
  "decision",
  "modelType",
  "monetizationScore",
  "expectedRoi",
  "ltvCacRatio",
  "sourceCount",
  "grounded",
  "provider",
  "strategy",
  "relevance",
  "validationResult",
  "newSourceCount",
  "uncertaintyBefore",
  "uncertaintyAfter",
  "fatalRiskBefore",
  "fatalRiskAfter",
  "assumptionCategory",
  "synthesisOnly",
  "candidateId",
  "candidateIds",
  "ventureId",
  "researchRunId",
  "status",
  "selected",
  "highlighted",
  "artifactRole",
  "estimatedCac",
  "priceLabel",
]);

const SECRET_PATTERN =
  /api[_-]?key|secret|password|token|service[_-]?role|credential|authorization|private[_-]?key/i;

export function sanitizeArtifactMetadata(
  input: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (SECRET_PATTERN.test(key)) continue;
    if (value == null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
      continue;
    }
    const text = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).join(",")
      : String(value);
    if (SECRET_PATTERN.test(text)) continue;
    out[key] = text.slice(0, key === "candidateIds" ? 2000 : 120);
  }
  return out;
}
