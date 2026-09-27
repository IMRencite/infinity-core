import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; error?: string; password_reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      description="Access your Infinity command center."
    >
      <LoginForm
        confirmed={params.confirmed === "true"}
        confirmationError={params.error === "confirmation_failed"}
        passwordResetSuccess={params.password_reset === "success"}
      />
    </AuthShell>
  );
}
