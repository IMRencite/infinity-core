"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { recoveryCredentialPresent, parseRecoveryCredentialFromSearch } from "@/lib/auth/recovery-landing";

type Phase = "awaiting_action" | "verifying" | "failed" | "missing";

export function RecoveryLandingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const credential = useMemo(
    () => parseRecoveryCredentialFromSearch(searchParams.toString()),
    [searchParams],
  );
  const [phase, setPhase] = useState<Phase>(() =>
    recoveryCredentialPresent(credential) ? "awaiting_action" : "missing",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleContinue() {
    if (!recoveryCredentialPresent(credential)) {
      setPhase("missing");
      return;
    }
    setPhase("verifying");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token_hash: credential.token_hash ?? undefined,
          code: credential.code ?? undefined,
          type: "recovery",
        }),
      });
      const json = (await response.json()) as { ok?: boolean };
      if (!response.ok || !json.ok) {
        setPhase("failed");
        setErrorMessage("This reset link is invalid or has expired.");
        return;
      }
      router.replace("/reset-password");
      router.refresh();
    } catch {
      setPhase("failed");
      setErrorMessage("Unable to verify this reset link. Please try again.");
    }
  }

  if (phase === "missing") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400" role="alert">
          This page needs a valid password reset link from your email. Request a new link if yours expired.
        </p>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
            Forgot password
          </Link>
        </p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90" role="alert">
          {errorMessage ?? "This reset link is invalid or has expired."}
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-zinc-400">
        You opened a password reset link for Infinity HQ. Select continue to verify the link and choose a new password.
      </p>
      <button
        type="button"
        disabled={phase === "verifying"}
        onClick={() => void handleContinue()}
        className="w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {phase === "verifying" ? "Verifying…" : "Continue to reset password"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
