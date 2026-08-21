import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockProviderAdapter } from "@/lib/infinity/ai-providers/adapters/mock-adapter";
import { answerHqCopilotQuery } from "../handle-query";
import { createHqCopilotReadRuntime } from "../read-adapters";

const root = join(dirname(import.meta.url), "../../../..");

function loadEnv() {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, sep)] = val;
    }
  } catch {
    // optional in CI
  }
}

loadEnv();

const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

describe.skipIf(!LIVE)("HQ Copilot live read smoke", () => {
  it("returns a grounded org-scoped portfolio answer without secrets", async () => {
    const response = await answerHqCopilotQuery({
      query: {
        organizationId: ORG,
        userId: "live-smoke",
        question: "What ventures are active?",
        currentRoute: "/dashboard",
      },
      runtime: createHqCopilotReadRuntime(createAdminClient()),
      provider: mockProviderAdapter,
    });

    expect(response.intent).toBe("PORTFOLIO_STATUS");
    expect(["GROUNDED", "INSUFFICIENT_EVIDENCE"]).toContain(response.groundingStatus);
    expect(response.blockedAction).toBeUndefined();
    expect(JSON.stringify(response)).not.toMatch(/sk_live_|SERVICE_ROLE|OPENAI_API_KEY|Bearer /);
    expect(response.answer.length).toBeGreaterThan(10);
  });

  it("blocks launch without writing", async () => {
    const response = await answerHqCopilotQuery({
      query: {
        organizationId: ORG,
        userId: "live-smoke",
        question: "Launch this venture.",
      },
      runtime: createHqCopilotReadRuntime(createAdminClient()),
      provider: mockProviderAdapter,
    });
    expect(response.blockedAction).toBe("EXECUTE");
    expect(response.groundingStatus).toBe("BLOCKED");
  });
});
