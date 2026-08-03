import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { WebsiteBuildState } from "./types";

export type WebsiteBuildMetadataRow = {
  organizationId: string;
  buildId: string;
  projectType: string;
  framework: string;
  routeManifest: unknown;
  componentManifest: unknown;
  metadataManifest: unknown;
  sitemapManifest: unknown;
  accessibilityStatus: string;
  seoStatus: string;
  securityStatus: string;
  qaStatus: string;
  internalPackageArtifactId: string | null;
};

export async function upsertWebsiteBuildMetadata(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    buildId: string;
    projectType: string;
    framework: string;
    state: WebsiteBuildState;
    accessibilityStatus?: string;
    seoStatus?: string;
    securityStatus?: string;
    qaStatus?: string;
    internalPackageArtifactId?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("website_build_metadata").upsert(
    {
      organization_id: input.organizationId,
      build_id: input.buildId,
      project_type: input.projectType,
      framework: input.framework,
      route_manifest: input.state.routeManifest as Json,
      component_manifest: input.state.componentManifest as Json,
      metadata_manifest: input.state.metadataManifest as Json,
      sitemap_manifest: input.state.sitemapManifest as Json,
      accessibility_status: input.accessibilityStatus ?? "unknown",
      seo_status: input.seoStatus ?? "unknown",
      security_status: input.securityStatus ?? "unknown",
      qa_status: input.qaStatus ?? "pending",
      internal_package_artifact_id: input.internalPackageArtifactId ?? null,
    },
    { onConflict: "build_id" },
  );

  if (error) {
    throw new Error(`website_build_metadata upsert failed: ${error.message}`);
  }
}

export async function loadWebsiteBuildMetadataSummary(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<WebsiteBuildMetadataRow | null> {
  const { data, error } = await admin
    .from("website_build_metadata")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("build_id", buildId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    organizationId: String(data.organization_id),
    buildId: String(data.build_id),
    projectType: String(data.project_type),
    framework: String(data.framework),
    routeManifest: data.route_manifest,
    componentManifest: data.component_manifest,
    metadataManifest: data.metadata_manifest,
    sitemapManifest: data.sitemap_manifest,
    accessibilityStatus: String(data.accessibility_status),
    seoStatus: String(data.seo_status),
    securityStatus: String(data.security_status),
    qaStatus: String(data.qa_status),
    internalPackageArtifactId: data.internal_package_artifact_id
      ? String(data.internal_package_artifact_id)
      : null,
  };
}
