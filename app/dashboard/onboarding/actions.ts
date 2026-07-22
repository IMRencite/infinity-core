"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateOrganizationState = {
  fieldErrors?: {
    name?: string;
  };
  formError?: string;
};

function generateSlug(name: string) {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return baseSlug || "organization";
}

function mapOrganizationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("already belongs to an organization")) {
    return "You already belong to an organization.";
  }

  if (normalized.includes("authentication required")) {
    return "You must be signed in to create an organization.";
  }

  if (
    normalized.includes("organization name is required") ||
    normalized.includes("organization slug is required")
  ) {
    return "Organization name is required.";
  }

  if (normalized.includes("invalid organization slug format")) {
    return "Organization name must produce a valid identifier. Try a different name.";
  }

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "An organization with a similar name already exists. Try a different name.";
  }

  if (normalized.includes("organizations_slug_format")) {
    return "Organization name must produce a valid identifier. Try a different name.";
  }

  return "Unable to create organization. Please try again.";
}

export async function userHasOrganization(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to verify organization membership.");
  }

  return Boolean(data);
}

export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return {
      fieldErrors: {
        name: "Organization name is required.",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let alreadyHasOrganization = false;

  try {
    alreadyHasOrganization = await userHasOrganization(supabase, user.id);
  } catch {
    return {
      formError: "Unable to verify organization membership. Please try again.",
    };
  }

  if (alreadyHasOrganization) {
    redirect("/dashboard");
  }

  try {
    const slug = generateSlug(name);

    const { data: organizationId, error } = await supabase.rpc(
      "create_organization_with_owner",
      {
        organization_name: name,
        organization_slug: slug,
      },
    );

    if (error) {
      return {
        formError: mapOrganizationError(error.message),
      };
    }

    if (!organizationId) {
      return {
        formError: "Unable to create organization. Please try again.",
      };
    }
  } catch {
    return {
      formError: "Unable to create organization. Please try again.",
    };
  }

  redirect("/dashboard");
}
