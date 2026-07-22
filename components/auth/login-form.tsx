"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

const inputClassName =
  "w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

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

export function LoginForm({
  confirmed = false,
  confirmationError = false,
}: {
  confirmed?: boolean;
  confirmationError?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="space-y-4">
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

      <form action={formAction} className="space-y-4" noValidate>
        {state.formError ? (
          <div
            className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400/90"
            role="alert"
          >
            {state.formError}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-zinc-400"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
            disabled={isPending}
            className={inputClassName}
            placeholder="you@company.com"
          />
          <FieldError id="email-error" message={state.fieldErrors?.email} />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium text-zinc-400"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
            disabled={isPending}
            className={inputClassName}
            placeholder="Your password"
          />
          <FieldError
            id="password-error"
            message={state.fieldErrors?.password}
          />
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
