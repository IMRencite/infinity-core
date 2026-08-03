import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWebsiteBuildMetadataSummary } from "@/lib/infinity/website-builder/metadata";
import { WEBSITE_INTERNAL_SOURCE_LABEL } from "@/lib/infinity/website-builder/constants";
import { verifyBuildReproducibility } from "@/lib/infinity/build-factory/reproducibility";
import { loadBuildById } from "@/lib/infinity/build-factory/workspace";

type Props = { params: Promise<{ buildId: string }> };

export default async function BuildDetailPage({ params }: Props) {
  const { buildId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const orgId = membership.organization_id;
  const admin = createAdminClient();
  const build = await loadBuildById(admin, orgId, buildId);
  if (!build) {
    notFound();
  }

  const meta = await loadWebsiteBuildMetadataSummary(admin, orgId, buildId);
  const repro = await verifyBuildReproducibility(build).catch(() => ({
    status: "unknown" as const,
    details: [],
  }));

  const routeCount = Array.isArray(meta?.routeManifest) ? meta!.routeManifest.length : 0;
  const componentCount = Array.isArray(meta?.componentManifest)
    ? meta!.componentManifest.length
    : 0;
  const fileCount = build.manifest?.fileManifest?.length ?? 0;
  const totalBytes =
    build.manifest?.fileManifest?.reduce((a, f) => a + (f.bytes ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-zinc-200">
      <header>
        <Link href="/dashboard/builds" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Builds
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-white">{build.specification.name}</h1>
        <p className="text-sm font-medium text-amber-200/90">{WEBSITE_INTERNAL_SOURCE_LABEL}</p>
        <p className="font-mono text-[10px] text-zinc-600">{buildId}</p>
      </header>

      <section className="rounded-lg border border-white/10 p-4 text-xs">
        <h2 className="mb-3 font-medium text-zinc-400">Website build summary</h2>
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-zinc-500">Project type</dt>
          <dd>{build.projectType}</dd>
          <dt className="text-zinc-500">Framework</dt>
          <dd>{meta?.framework ?? build.specification.website?.framework ?? "—"}</dd>
          <dt className="text-zinc-500">Routes</dt>
          <dd>{routeCount}</dd>
          <dt className="text-zinc-500">Components</dt>
          <dd>{componentCount}</dd>
          <dt className="text-zinc-500">Manifest files</dt>
          <dd>{fileCount}</dd>
          <dt className="text-zinc-500">Total bytes (manifest)</dt>
          <dd>{totalBytes}</dd>
          <dt className="text-zinc-500">Build status</dt>
          <dd>{build.status}</dd>
          <dt className="text-zinc-500">Accessibility</dt>
          <dd>{meta?.accessibilityStatus ?? "—"}</dd>
          <dt className="text-zinc-500">SEO</dt>
          <dd>{meta?.seoStatus ?? "—"}</dd>
          <dt className="text-zinc-500">Security</dt>
          <dd>{meta?.securityStatus ?? "—"}</dd>
          <dt className="text-zinc-500">QA</dt>
          <dd>{meta?.qaStatus ?? build.reviewStatus}</dd>
          <dt className="text-zinc-500">Snapshot</dt>
          <dd className="font-mono text-[10px]">{build.currentSnapshotId ?? "—"}</dd>
          <dt className="text-zinc-500">Reproducibility</dt>
          <dd>{repro.status}</dd>
          <dt className="text-zinc-500">Source package</dt>
          <dd>{meta?.internalPackageArtifactId ? "recorded" : "internal-website-package.json"}</dd>
        </dl>
        {build.status === "failed" && (
          <p className="mt-3 text-amber-300">Blockers may appear in validation or QA reports.</p>
        )}
      </section>
    </div>
  );
}
