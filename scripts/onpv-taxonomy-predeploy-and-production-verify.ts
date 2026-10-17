import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  evaluateOnpvCategoryPartitionQc,
  evaluateOnpvPublishedTaxonomyInventoryQc,
  evaluateOnpvTagCategoryFallbackQc,
  expectedCategorySlugs,
} from "../lib/infinity/organic-growth-engine/continuous/onpv-published-taxonomy-inventory-qc";
import {
  evaluateBlogTaxonomyArchiveCountParityQc,
  evaluateBlogTaxonomyArchiveMembershipQc,
  evaluateBlogCategoryTagSemanticSeparationQc,
  evaluateOccupancyNpvCategoryArchiveMembership,
  evaluateOccupancyNpvTagArchiveMembership,
} from "../lib/infinity/organic-growth-engine/continuous/blog-taxonomy-archive-membership-qc";
import { evaluateBlogMediaDeployArtifactQc } from "../lib/infinity/organic-growth-engine/continuous/blog-deploy-media-bundle";
import { composeOccupancyNpvOrganicLiveFiles, deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { occupancynpvActiveTags, occupancynpvPublishedBlogPosts } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-catalog";
import { blogCategoryArchivePath, blogTagArchivePath, taxonomySlug } from "../lib/infinity/organic-growth-engine/continuous/blog-taxonomy";
import { evaluateVerifiedCommittedFixSameSessionPolicyQc } from "../lib/infinity/autonomous-portfolio-operations/verified-committed-fix-same-session-policy";

function extractArchiveSlugs(html: string): string[] {
  const slugs: string[] = [];
  const re = /data-blog-archive-card="true"[\s\S]*?<a href="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1] ?? "";
    slugs.push(path.replace(/\/+$/, "").split("/").pop() ?? path);
  }
  return slugs;
}

async function main() {
  const mode = process.argv.includes("--deploy") ? "deploy" : process.argv.includes("--verify-only") ? "verify" : "predeploy";
  const releaseSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const sourceDirty = execSync("git diff --name-only HEAD -- lib scripts public app", { encoding: "utf8" }).trim();
  const deploySourceQc = sourceDirty ? "FAIL" : "PASS";

  const inventory = evaluateOnpvPublishedTaxonomyInventoryQc();
  const partition = evaluateOnpvCategoryPartitionQc();
  const tagFallback = evaluateOnpvTagCategoryFallbackQc();
  const membership = evaluateBlogTaxonomyArchiveMembershipQc();
  const countParity = evaluateBlogTaxonomyArchiveCountParityQc();
  const semantic = evaluateBlogCategoryTagSemanticSeparationQc();
  const mediaArtifact = evaluateBlogMediaDeployArtifactQc({ deploy_files: composeOccupancyNpvOrganicLiveFiles().files });

  const predeployOk =
    inventory.result === "PASS" &&
    partition.result === "PASS" &&
    tagFallback.result === "PASS" &&
    membership.result === "PASS" &&
    countParity.result === "PASS" &&
    semantic.result === "PASS" &&
    mediaArtifact.result === "PASS";

  let deployment: Awaited<ReturnType<typeof deployOccupancyNpvOrganicLivePage>> | null = null;
  if (mode === "deploy" && predeployOk) {
    deployment = await deployOccupancyNpvOrganicLivePage({ deploy: true, pollAttempts: 45, pollDelayMs: 6000 });
  }

  const production: Record<string, unknown> = {};
  let categoryFailures = 0;
  let tagMembershipFailures = 0;
  let tagCountFailures = 0;
  let tagDuplicates = 0;
  let emptyMismatch = 0;

  if (mode !== "predeploy" && (deployment?.deployed || mode === "verify-only")) {
    const expectedCats = expectedCategorySlugs();
    for (const [slug, expectedSlugs] of Object.entries(expectedCats)) {
      const url = `https://occupancynpv.com${blogCategoryArchivePath(slug)}`;
      const res = await fetchPublicHtml(url);
      const rendered = extractArchiveSlugs(res.body);
      const empty = res.body.includes("No published posts in this archive.");
      const expectedSet = new Set(expectedSlugs);
      const renderedSet = new Set(rendered);
      const ok =
        expectedSlugs.length === rendered.length &&
        expectedSlugs.every((s) => renderedSet.has(s)) &&
        rendered.every((s) => expectedSet.has(s)) &&
        !empty;
      if (!ok) categoryFailures += 1;
      if (expectedSlugs.length > 0 && empty) emptyMismatch += 1;
      production[`category_${slug}`] = { expectedSlugs, renderedSlugs: rendered, empty, url };
    }

    const tags = occupancynpvActiveTags();
    for (const row of tags) {
      const url = `https://occupancynpv.com${blogTagArchivePath(row.tag)}`;
      const res = await fetchPublicHtml(url);
      const audit = evaluateOccupancyNpvTagArchiveMembership({ tag: row.tag, html: res.body });
      if (audit.missing.length || audit.wrong.length) tagMembershipFailures += 1;
      if (audit.duplicates.length) tagDuplicates += audit.duplicates.length;
      const attr = res.body.match(/data-blog-archive-count="(\d+)"/);
      const renderedCount = attr ? Number(attr[1]) : extractArchiveSlugs(res.body).length;
      if (renderedCount !== audit.expected.length) tagCountFailures += 1;
    }

    const occUrl = `https://occupancynpv.com/blog/category/occupancy-costs/`;
    const occ = await fetchPublicHtml(occUrl);
    production.occupancy_browser = {
      card_count: extractArchiveSlugs(occ.body).length,
      empty_state: occ.body.includes("No published posts in this archive."),
      broken_image_count: (occ.body.match(/<img[^>]+src="[^"]*\.svg"/gi) ?? []).length,
    };
  }

  const policy = evaluateVerifiedCommittedFixSameSessionPolicyQc({
    committed_tree_only: deploySourceQc === "PASS",
    required_tests_pass: predeployOk,
    required_build_pass: mediaArtifact.result === "PASS",
    required_smoke_pass: mode === "predeploy" ? true : categoryFailures === 0 && tagMembershipFailures === 0,
    reversible: true,
    no_spend: true,
    no_new_vendor_domain: true,
    no_legal_manufacturing: true,
  });

  const hold =
    mode !== "predeploy" && categoryFailures === 0 && tagMembershipFailures === 0 && emptyMismatch === 0
      ? "CLEARED"
      : mode === "predeploy"
        ? "ACTIVE"
        : "ACTIVE";

  const payload = {
    release_sha: releaseSha,
    mode,
    ONPV_PUBLISHED_TAXONOMY_INVENTORY_QC: inventory.result,
    ONPV_CATEGORY_PARTITION_QC: partition.result,
    inventory,
    partition,
    tagFallback,
    BLOG_TAXONOMY_ARCHIVE_MEMBERSHIP_QC: membership.result,
    BLOG_TAXONOMY_ARCHIVE_COUNT_PARITY_QC: countParity.result,
    BLOG_CATEGORY_TAG_SEMANTIC_SEPARATION_QC: semantic.result,
    BLOG_MEDIA_DEPLOY_ARTIFACT_QC: mediaArtifact.result,
    ONPV_DEPLOY_SOURCE_COMMITTED_TREE_ONLY_QC: deploySourceQc,
    ONPV_TAXONOMY_DEPLOYMENT_ID: deployment?.deployment_id ?? null,
    ONPV_TAXONOMY_RELEASE_SHA: releaseSha,
    ONPV_TAXONOMY_RELEASE_DIRTY: Boolean(dirty.trim()),
    deployed: deployment?.deployed ?? false,
    ONPV_CATEGORY_MEMBERSHIP_FAILURE_COUNT: categoryFailures,
    ONPV_TAG_MEMBERSHIP_FAILURE_COUNT: tagMembershipFailures,
    ONPV_TAG_COUNT_PARITY_FAILURE_COUNT: tagCountFailures,
    ONPV_TAG_DUPLICATE_CARD_COUNT: tagDuplicates,
    ONPV_CATEGORY_EMPTY_ARCHIVE_MISMATCH_COUNT: emptyMismatch,
    ONPV_TAG_ROUTES_TOTAL: occupancynpvActiveTags().length,
    ONPV_TAG_ROUTES_CHECKED: mode === "predeploy" ? 0 : occupancynpvActiveTags().length,
    BLOG_TAXONOMY_ARCHIVE_DEPLOY_HOLD: hold,
    VERIFIED_COMMITTED_FIX_SAME_SESSION_POLICY_QC: policy.result,
    production,
    expected_categories: expectedCategorySlugs(),
  };

  mkdirSync(join(process.cwd(), ".infinity", "blog-os"), { recursive: true });
  writeFileSync(join(process.cwd(), ".infinity", "blog-os", "onpv-taxonomy-production-closure.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (mode === "deploy" && (!deployment?.deployed || !predeployOk)) process.exitCode = 1;
  if (mode !== "predeploy" && hold !== "CLEARED") process.exitCode = 1;
}

void main();
