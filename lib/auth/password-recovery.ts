import { HQ_PRODUCTION_ORIGIN } from "@/lib/infinity/hq-production-deployment/contract";
import { HQ_RECOVERY_LANDING_PATH, passwordRecoveryLandingForOrigin } from "@/lib/auth/recovery-landing";

export const HQ_FORGOT_PASSWORD_PATH = "/forgot-password" as const;
export const HQ_RESET_PASSWORD_PATH = "/reset-password" as const;
export { HQ_RECOVERY_LANDING_PATH };

/** Production recovery landing URL — add to Supabase Auth redirect allow list. */
export const HQ_PASSWORD_RESET_REDIRECT_URL = `${HQ_PRODUCTION_ORIGIN}${HQ_RESET_PASSWORD_PATH}` as const;

export const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists for that email, a password reset link has been sent." as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateForgotPasswordEmail(email: string): { email?: string } {
  const trimmed = email.trim();
  if (!trimmed) return { email: "Email is required." };
  if (!EMAIL_PATTERN.test(trimmed)) return { email: "Enter a valid email address." };
  return {};
}

export function validatePasswordResetFields(password: string, confirmPassword: string) {
  const fieldErrors: { password?: string; confirmPassword?: string } = {};
  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  return fieldErrors;
}

/** Safe client redirect target for resetPasswordForEmail (allow-list recovery landing). */
export function passwordResetRedirectForBrowserOrigin(origin: string): string {
  return passwordRecoveryLandingForOrigin(origin);
}

export function mapForgotPasswordError(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return null;
}

export function mapPasswordUpdateError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("different from the old password")
    || normalized.includes("different from your current password")
    || normalized.includes("same password")
    || normalized.includes("same_password")
    || normalized.includes("password should be different")
  ) {
    return "Please choose a new password that is different from your current password.";
  }
  if (normalized.includes("session") && normalized.includes("missing")) {
    return "This reset link is invalid or has expired. Request a new link from the forgot password page.";
  }
  return "Unable to update your password. Request a new reset link and try again.";
}
