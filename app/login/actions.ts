"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  formError?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(formData: FormData) {
  const fieldErrors: NonNullable<LoginState["fieldErrors"]> = {};

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  }

  return { fieldErrors, email, password };
}

function mapLoginError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Invalid email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "Unable to sign in. Please try again.";
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { fieldErrors, email, password } = validateLoginForm(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        formError: mapLoginError(error.message),
      };
    }
  } catch {
    return {
      formError: "Unable to sign in. Please try again.",
    };
  }

  redirect("/");
}
