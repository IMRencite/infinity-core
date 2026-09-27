import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="We will email a secure link if an account exists for that address."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
