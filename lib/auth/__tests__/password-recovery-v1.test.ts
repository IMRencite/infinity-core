import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HQ_PASSWORD_RESET_REDIRECT_URL,
  PASSWORD_RESET_NEUTRAL_MESSAGE,
  validateForgotPasswordEmail,
  validatePasswordResetFields,
} from "../password-recovery";
import { HQ_PRODUCTION_PASSWORD_RESET_URL } from "@/lib/infinity/hq-production-deployment/auth-redirect";
import { HQ_PUBLIC_AUTH_PATHS } from "@/lib/infinity/hq-production-deployment/contract";
import { classifyHqPath } from "@/lib/infinity/hq-production-deployment/surface";

const root = process.cwd();

describe("HQ password recovery v1", () => {
  it("uses canonical production reset redirect URLs", () => {
    expect(HQ_PASSWORD_RESET_REDIRECT_URL).toBe("https://hq.imros.io/reset-password");
    expect(HQ_PRODUCTION_PASSWORD_RESET_URL).toBe(HQ_PASSWORD_RESET_REDIRECT_URL);
  });

  it("exposes public auth routes for forgot and reset password", () => {
    expect(HQ_PUBLIC_AUTH_PATHS).toContain("/forgot-password");
    expect(HQ_PUBLIC_AUTH_PATHS).toContain("/reset-password");
    expect(classifyHqPath("/forgot-password")).toBe("PUBLIC_AUTH");
    expect(classifyHqPath("/reset-password")).toBe("PUBLIC_AUTH");
  });

  it("validates recovery form fields", () => {
    expect(validateForgotPasswordEmail("")).toEqual({ email: "Email is required." });
    expect(validateForgotPasswordEmail("bad")).toEqual({ email: "Enter a valid email address." });
    expect(validateForgotPasswordEmail("founder@example.com")).toEqual({});
    expect(validatePasswordResetFields("short", "short").password).toMatch(/8 characters/);
    expect(validatePasswordResetFields("longenough", "different").confirmPassword).toMatch(/do not match/);
  });

  it("wires login forgot link and neutral reset request copy", () => {
    const login = readFileSync(join(root, "components/auth/login-form.tsx"), "utf8");
    const forgot = readFileSync(join(root, "components/auth/forgot-password-form.tsx"), "utf8");
    expect(login).toContain('href="/forgot-password"');
    expect(login).toContain("Forgot password?");
    expect(forgot).toContain("resetPasswordForEmail");
    expect(forgot).toContain("PASSWORD_RESET_NEUTRAL_MESSAGE");
    expect(forgot).not.toMatch(/already registered|does not exist|no account/i);
  });

  it("requires recovery session before updateUser on reset page", () => {
    const reset = readFileSync(join(root, "components/auth/reset-password-form.tsx"), "utf8");
    expect(reset).toContain("PASSWORD_RECOVERY");
    expect(reset).toContain("updateUser");
    expect(reset).toContain('phase === "invalid"');
    expect(reset).not.toMatch(/service.role|service_role/i);
  });
});
