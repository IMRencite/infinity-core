import { Suspense } from "react";
import { RecoveryLandingForm } from "@/components/auth/recovery-landing-form";

export default function RecoveryLandingPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-white">Password reset</h1>
        <p className="text-sm text-zinc-500">Infinity HQ</p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-zinc-500">Loading…</p>}>
        <RecoveryLandingForm />
      </Suspense>
    </div>
  );
}
