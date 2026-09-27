"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapForgotPasswordError,
  PASSWORD_RESET_NEUTRAL_MESSAGE,
  passwordResetRedirectForBrowserOrigin,
  validateForgotPasswordEmail,
} from "@/lib/auth/password-recovery";

const inputClassName =
  "w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-400/90" role="alert">
      {message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const nextFieldErrors = validateForgotPasswordEmail(email);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    try {
      const supabase = createClient();
      const redirectTo = passwordResetRedirectForBrowserOrigin(window.location.origin);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      const rateLimitMessage = error ? mapForgotPasswordError(error.message) : null;
      if (rateLimitMessage) {
        setFormError(rateLimitMessage);
        setIsPending(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md border border-sky-500/20 bg-sky-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm leading-relaxed text-zinc-300">{PASSWORD_RESET_NEUTRAL_MESSAGE}</p>
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link
            href="/login"
            className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
          >
            Back to sign in
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

      <p className="text-sm leading-relaxed text-zinc-500">
        Enter the email for your account. We will send a secure link to reset your password.
      </p>

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
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className={inputClassName}
          placeholder="you@company.com"
        />
        <FieldError id="email-error" message={fieldErrors.email} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
