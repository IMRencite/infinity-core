"use client";

import { useActionState } from "react";
import {
  createOrganization,
  type CreateOrganizationState,
} from "@/app/dashboard/onboarding/actions";

const initialState: CreateOrganizationState = {};

const inputClassName =
  "w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganization,
    initialState,
  );

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
          htmlFor="organization-name"
          className="mb-1.5 block text-xs font-medium text-zinc-400"
        >
          Organization name
        </label>
        <input
          id="organization-name"
          name="name"
          type="text"
          autoComplete="organization"
          required
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={
            state.fieldErrors?.name ? "organization-name-error" : undefined
          }
          disabled={isPending}
          className={inputClassName}
          placeholder="Your venture studio or company"
        />
        {state.fieldErrors?.name ? (
          <p
            id="organization-name-error"
            className="mt-1.5 text-xs text-red-400/90"
            role="alert"
          >
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-md border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating organization..." : "Create organization"}
      </button>
    </form>
  );
}
