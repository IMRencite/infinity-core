import { scanForSecrets } from "@/lib/infinity/coding-agents/qa";
import { assertNoSecretsInContent } from "@/lib/infinity/production-artifact/types";

const FORBIDDEN = [
  /SUPABASE_SERVICE_ROLE/i,
  /OPENAI_API_KEY/i,
  /GEMINI_API_KEY/i,
  /VERCEL_TOKEN/i,
  /STRIPE_SECRET/i,
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]+/,
  /TREASURY_.*=/,
  /INFINITY_ADMIN/i,
];

export function evaluateSecretSafety(
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>,
): {
  status: "PASS" | "FAIL";
  hits: string[];
} {
  const hits: string[] = [];
  const textFiles = files.filter((file) => file.encoding !== "base64");
  const scanned = scanForSecrets(textFiles.map((file) => file.content));
  hits.push(...scanned);
  for (const file of textFiles) {
    try {
      assertNoSecretsInContent(file.content, file.path);
    } catch (error) {
      hits.push(error instanceof Error ? error.message : `secret:${file.path}`);
    }
    for (const pattern of FORBIDDEN) {
      if (pattern.test(file.content)) hits.push(`${file.path}:${pattern.source}`);
    }
  }
  return { status: hits.length ? "FAIL" : "PASS", hits: [...new Set(hits)] };
}
