"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  lookupOrganizationMembership,
  membershipUnavailableUserMessage,
} from "@/lib/infinity/operator-console/membership-lookup";
import { workspaceUnavailablePath } from "@/lib/infinity/operator-console/workspace-unavailable-path";

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

export async function userHasOrganization(userId: string) {
  const supabase = await createClient();
  const membership = await lookupOrganizationMembership(supabase, userId);
  return membership;
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

  const membership = await lookupOrganizationMembership(supabase, user.id);

  if (membership.status === "error") {
    return {
      formError: membershipUnavailableUserMessage(membership.code),
    };
  }

  if (membership.hasMembership) {
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
