import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start building with Infinity. We will send a confirmation link to your email."
    >
      <SignupForm />
    </AuthShell>
  );
}
