import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseRecoveryCredentialFromSearch,
  recoveryCredentialPresent,
  recoveryLandingMustNotAutoVerify,
  supabaseRecoveryEmailLinkTemplate,
} from "../recovery-landing";

const root = process.cwd();

describe("HQ scanner-safe password recovery", () => {
  it("uses TokenHash landing link template instead of ConfirmationURL", () => {
    const link = supabaseRecoveryEmailLinkTemplate();
    expect(link).toContain("token_hash={{ .TokenHash }}");
    expect(link).toContain("/auth/recovery");
    expect(link).not.toContain("ConfirmationURL");
  });

  it("parses recovery credentials without logging them", () => {
    const params = parseRecoveryCredentialFromSearch("?token_hash=abc&type=recovery");
    expect(params.token_hash).toBe("abc");
    expect(params.type).toBe("recovery");
    expect(recoveryCredentialPresent(params)).toBe(true);
    expect(recoveryCredentialPresent({ token_hash: null, code: null, type: "recovery" })).toBe(false);
  });

  it("recovery landing does not auto-verify on mount", () => {
    const landing = readFileSync(join(root, "components/auth/recovery-landing-form.tsx"), "utf8");
    expect(landing).not.toMatch(/useEffect[\s\S]*verifyOtp/);
    expect(landing).not.toMatch(/useEffect[\s\S]*exchangeCodeForSession/);
    expect(recoveryLandingMustNotAutoVerify(landing)).toBe(true);
  });

  it("reset page does not exchange recovery codes", () => {
    const reset = readFileSync(join(root, "components/auth/reset-password-form.tsx"), "utf8");
    expect(reset).not.toMatch(/exchangeCodeForSession/);
    expect(reset).toContain("updateUser");
  });

  it("callback defers recovery exchange to landing page", () => {
    const callback = readFileSync(join(root, "app/auth/callback/route.ts"), "utf8");
    expect(callback).toMatch(/if \(recoveryNext\)[\s\S]*\/auth\/recovery/);
    const afterRecovery = callback.split("if (recoveryNext)")[1]?.split("if (!code)")[0] ?? "";
    expect(afterRecovery).not.toMatch(/exchangeCodeForSession/);
  });

  it("verify route is the single server verification entry for token_hash", () => {
    const route = readFileSync(join(root, "app/api/auth/recovery/verify/route.ts"), "utf8");
    expect(route).toContain('verifyOtp({ token_hash: tokenHash, type: "recovery" })');
    expect(route).not.toMatch(/console\.(log|info|debug)/);
  });
});
