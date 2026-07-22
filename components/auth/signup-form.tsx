"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "@/app/signup/actions";

const initialState: SignupState = {};

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

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-emerald-400/90">
            Check your email
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We sent a confirmation link to{" "}
            <span className="text-zinc-200">{state.email}</span>. Open the link
            in your email to verify your account before signing in.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
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
          htmlFor="fullName"
          className="mb-1.5 block text-xs font-medium text-zinc-400"
        >
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={
            state.fieldErrors?.fullName ? "fullName-error" : undefined
          }
          disabled={isPending}
          className={inputClassName}
          placeholder="Your name"
        />
        <FieldError id="fullName-error" message={state.fieldErrors?.fullName} />
      </div>

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
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
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
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password ? "password-error" : undefined
          }
          disabled={isPending}
          className={inputClassName}
          placeholder="At least 8 characters"
        />
        <FieldError id="password-error" message={state.fieldErrors?.password} />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-xs font-medium text-zinc-400"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          aria-describedby={
            state.fieldErrors?.confirmPassword
              ? "confirmPassword-error"
              : undefined
          }
          disabled={isPending}
          className={inputClassName}
          placeholder="Repeat your password"
        />
        <FieldError
          id="confirmPassword-error"
          message={state.fieldErrors?.confirmPassword}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
