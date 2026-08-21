const SECRET_PATTERNS = [
  /sk_live_[A-Za-z0-9]+/g,
  /sk_test_[A-Za-z0-9]+/g,
  /whsec_[A-Za-z0-9]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]+/g,
  /supabase.*service.*role/gi,
  /OPENAI_API_KEY/gi,
  /ANTHROPIC_API_KEY/gi,
  /NAMECHEAP_API_KEY/gi,
  /CLOUDFLARE_API_TOKEN/gi,
];

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

export function stripSecretsFromCopilotText(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out;
}

export function hideIdsUnlessRequested(text: string, question: string): string {
  if (/\b(uuid|id|technical detail|raw id)\b/i.test(question)) return text;
  return text.replace(UUID_RE, "recorded record");
}

export function clampCopilotText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function sanitizeCopilotAnswer(answer: string, question: string): string {
  return hideIdsUnlessRequested(stripSecretsFromCopilotText(answer), question).trim();
}
