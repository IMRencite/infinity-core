import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Use the link from your email to set a new password for your Infinity HQ account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
