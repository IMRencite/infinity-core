"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { validatePasswordResetFields } from "@/lib/auth/password-recovery";
import { completeBrowserLogin } from "@/lib/auth/complete-browser-login";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

type RecoveryPhase = "loading" | "invalid" | "ready" | "success";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-400/90" role="alert">
      {message}
    </p>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<RecoveryPhase>("loading");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function bootstrapRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        const cleanPath = url.pathname + (url.search || "");
        window.history.replaceState({}, "", cleanPath);
        if (error && !cancelled) {
          setPhase("invalid");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session) {
        setPhase("ready");
      } else if (!cancelled) {
        setPhase("invalid");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setPhase("ready");
      }
    });

    void bootstrapRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextFieldErrors = validatePasswordResetFields(password, confirmPassword);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setPhase("invalid");
        setIsPending(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError("Unable to update your password. Request a new reset link and try again.");
        setIsPending(false);
        return;
      }

      setPhase("success");
      const completion = await completeBrowserLogin(supabase, "/dashboard", { session });
      if (completion.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      router.replace("/login?password_reset=success");
    } catch {
      setFormError("Unable to update your password. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (phase === "loading") {
    return <p className="text-sm text-zinc-500">Verifying your reset link…</p>;
  }

  if (phase === "success") {
    return (
      <p className="text-sm text-zinc-400" role="status">
        Password updated. Redirecting…
      </p>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90"
          role="alert"
        >
          This reset link is invalid or has expired. Request a new link from the forgot password page.
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link
            href="/forgot-password"
            className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <div
          className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400/90"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className={inputClassName}
        />
        <FieldError id="password-error" message={fieldErrors.password} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
          className={inputClassName}
        />
        <FieldError id="confirm-password-error" message={fieldErrors.confirmPassword} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
