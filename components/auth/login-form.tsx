"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import { mapLoginError, validateLoginFields } from "@/lib/auth/login-validation";
import {
  authCookieNamesFromDocument,
  completeBrowserLogin,
} from "@/lib/auth/complete-browser-login";
import { createClient } from "@/lib/supabase/client";

const AUTH_DEBUG =
  process.env.NEXT_PUBLIC_AUTH_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

const inputClassName =
  "w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

function localStorageSupabaseKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && (key.includes("supabase") || key.includes("-auth-token"))) {
      keys.push(key);
    }
  }
  return keys;
}

function logAuth(message: string, detail?: Record<string, unknown>) {
  if (!AUTH_DEBUG) return;
  console.info(`[AUTH] ${message}`, detail ?? "");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-1.5 text-xs text-red-400/90" role="alert">
      {message}
    </p>
  );
}

function LoginFormInner({
  confirmed = false,
  confirmationError = false,
  passwordResetSuccess = false,
}: {
  confirmed?: boolean;
  confirmationError?: boolean;
  passwordResetSuccess?: boolean;
}) {
  const searchParams = useSearchParams();
  const forensicMode = searchParams.get("auth_forensic") === "1";

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [forensicReport, setForensicReport] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setForensicReport(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextFieldErrors = validateLoginFields(email, password);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsPending(true);
    logAuth("submit started");
    logAuth("browser cookie names before signin", {
      names: authCookieNamesFromDocument(),
    });
    logAuth("localStorage keys before signin", { keys: localStorageSupabaseKeys() });

    try {
      logAuth("browser client creating");
      const supabase = createClient();
      logAuth("browser client created");

      const signInStarted = performance.now();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      const signInMs = Math.round(performance.now() - signInStarted);

      logAuth("signIn completed", { elapsedMs: signInMs });

      if (error) {
        logAuth("signIn error", { code: error.code ?? "none", message: error.message });
        setFormError(mapLoginError(error.message));
        setIsPending(false);
        return;
      }

      logAuth("user returned", { value: Boolean(data.user) });
      logAuth("session returned", { value: Boolean(data.session) });

      if (!data.session || !data.user) {
        setFormError("Unable to establish a session. Please try again.");
        setIsPending(false);
        return;
      }

      const cookieNamesAfter = authCookieNamesFromDocument();
      const storageKeysAfter = localStorageSupabaseKeys();
      logAuth("browser cookie names after signin", { names: cookieNamesAfter });
      logAuth("localStorage keys after signin", { keys: storageKeysAfter });
      logAuth("auth cookie present", { value: cookieNamesAfter.length > 0 });

      const {
        data: { user: browserUser },
        error: browserUserError,
      } = await supabase.auth.getUser();
      logAuth("browser getUser after signin", {
        authenticated: Boolean(browserUser),
        error: browserUserError?.message ?? null,
      });

      const {
        data: { session: browserSession },
        error: browserSessionError,
      } = await supabase.auth.getSession();
      logAuth("browser getSession after signin", {
        present: Boolean(browserSession),
        error: browserSessionError?.message ?? null,
      });

      if (forensicMode) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const diagnostic = await fetch("/api/auth/diagnostic", {
          credentials: "include",
          cache: "no-store",
        });
        const diagnosticJson = await diagnostic.json();
        logAuth("server diagnostic after signin (forensic hold)", diagnosticJson);
        setForensicReport(JSON.stringify(diagnosticJson, null, 2));
        setIsPending(false);
        return;
      }

      const completion = await completeBrowserLogin(supabase);
      if (!completion.ok) {
        setFormError(completion.reason);
        setIsPending(false);
      }
    } catch (caught) {
      logAuth("submit exception", {
        message: caught instanceof Error ? caught.message : String(caught),
      });
      setFormError("Unable to sign in. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {AUTH_DEBUG ? (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300/90">
          Auth diagnostics enabled — open browser console for [AUTH] logs. Add{" "}
          <code className="text-amber-200">?auth_forensic=1</code> to hold navigation after sign-in.
        </p>
      ) : null}

      {confirmed ? (
        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm leading-relaxed text-emerald-400/90">
            Your email has been verified. You can now sign in.
          </p>
        </div>
      ) : null}

      {confirmationError ? (
        <div
          className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400/90"
          role="alert"
        >
          We could not confirm your email. Please try signing up again.
        </div>
      ) : null}

      {passwordResetSuccess ? (
        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm leading-relaxed text-emerald-400/90">
            Your password has been updated. Sign in with your new password.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError ? (
          <div
            className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400/90"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        {forensicReport ? (
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/40 p-3 text-xs text-zinc-300">
            {forensicReport}
          </pre>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            disabled={isPending}
            className={inputClassName}
            placeholder="you@company.com"
          />
          <FieldError id="email-error" message={fieldErrors.email} />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            disabled={isPending}
            className={inputClassName}
            placeholder="Your password"
          />
          <FieldError id="password-error" message={fieldErrors.password} />
          <p className="mt-2 text-right text-xs">
            <Link
              href="/forgot-password"
              className="font-medium text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export function LoginForm(props: {
  confirmed?: boolean;
  confirmationError?: boolean;
  passwordResetSuccess?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner {...props} />
    </Suspense>
  );
}
