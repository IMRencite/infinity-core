import { createHash } from "node:crypto";
import { sitemapSource } from "@/lib/infinity/public-venture-template";
import { creDesignContext, planCreativeAssets, planPublicVentureComposition, produceVentureDesignDirection, premiumVenturePrimitivesSource } from "@/lib/infinity/public-venture-design";
import { PREMIUM_AUTHORITY_SITE_ARTIFACT_CONTRACT, PREMIUM_AUTHORITY_SITE_REPAIR_REASON, CONTENT_ARCHITECTURE_VERSION, DESIGN_SYSTEM_VERSION, VENTURE_SITE_ARCHITECTURE_VERSION } from "./constants";
import { comparePageSource, conversionLayoutSource, discountPageBody, educationalPageSource, faqPageSource, howItWorksPageSource, authorityHomepageSource, legalMetadataSource, npvPageBody, pricingPageSource, resourcesPageSource, tiPageBody } from "./page-sources";
import { auditInternalLinks, auditPremiumAuthoritySite, wordCountOf } from "./quality-gates";
import { buildPageSchema } from "./schema-builder";
import { robotsSource, siteChromeSource, siteLayoutSource, siteSchemaModule } from "./site-chrome";
import { premiumAuthoritySiteCss } from "./site-css";
import type { ComposeAuthorityInput, ContentEvidence, PageContentReport, PlannedPage } from "./types";

export function premiumAuthorityArtifactIdFor(input: {
  planId: string;
  packageId: string;
  packageVersion: string | number;
  contract?: string;
}): string {
  return `art_${createHash("sha256")
    .update([input.planId, input.packageId, String(input.packageVersion), input.contract ?? PREMIUM_AUTHORITY_SITE_ARTIFACT_CONTRACT].join(":"))
    .digest("hex")
    .slice(0, 20)}`;
}

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function pageFile(route: string): string {
  return route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
}

const FAQ_NPV = [
  { "@type": "Question", name: "Is NPV the same as a cap rate?", acceptedAnswer: { "@type": "Answer", text: "No. A cap rate is a different market shorthand. NPV here is a discounted occupancy-cost tool for comparing specified alternatives." } },
  { "@type": "Question", name: "Can I skip NPV and add the years?", acceptedAnswer: { "@type": "Answer", text: "Undiscounted totals treat a dollar in year five as equal to a dollar this year. That is a different question." } },
];

const FAQ_COMPARE = [
  { "@type": "Question", name: "Should percentage rent be in the same model?", acceptedAnswer: { "@type": "Answer", text: "If the lease includes it, yes as an explicit scenario, not a hidden plug." } },
  { "@type": "Question", name: "Is a lower NPV always the better occupancy choice?", acceptedAnswer: { "@type": "Answer", text: "No. NPV is a consistency tool. Operations and unmodeled terms still matter." } },
];

const FAQ_PAGE = [
  { "@type": "Question", name: "Is this a finished product?", acceptedAnswer: { "@type": "Answer", text: "No. This is an early validation / pilot concept and is not generally available." } },
  { "@type": "Question", name: "Is payment collected here?", acceptedAnswer: { "@type": "Answer", text: "No. Pricing shown is a hypothesis. A form selection indicates interest only." } },
  { "@type": "Question", name: "Are the sample lease numbers customer results?", acceptedAnswer: { "@type": "Answer", text: "No. Tables and NPV figures are illustrative samples, not customer data." } },
];

export function composePremiumAuthoritySiteArtifact(input: ComposeAuthorityInput): {
  files: Array<{ path: string; content: string }>;
  quality: ReturnType<typeof auditPremiumAuthoritySite>;
  contentReport: PageContentReport[];
} {
  const direction = produceVentureDesignDirection(creDesignContext());
  const tokens = input.tokens;
  const composition = planPublicVentureComposition(creDesignContext());
  const creative = input.creative;
  let files = input.files.map((item) => ({ ...item }));
  const schemaByRoute: Record<string, unknown> = {};
  for (const page of input.architecture.pages) {
    const extra =
      page.route === "/faq" ? { faq: FAQ_PAGE } : page.route === "/commercial-lease-npv" ? { faq: FAQ_NPV } : page.route === "/compare-commercial-leases" ? { faq: FAQ_COMPARE } : {};
    schemaByRoute[page.route] = buildPageSchema(page, extra);
  }
  files = upsert(files, "styles/globals.css", premiumAuthoritySiteCss(tokens));
  files = upsert(files, "components/site-chrome.tsx", siteChromeSource());
  files = upsert(files, "lib/site-schema.ts", siteSchemaModule(schemaByRoute));
  files = upsert(files, "app/layout.tsx", siteLayoutSource(input.architecture.pages[0]?.title ?? "Commercial lease NPV comparison"));
  files = upsert(files, "app/robots.ts", robotsSource());
  files = upsert(
    files,
    "app/sitemap.ts",
    sitemapSource(input.architecture.pages.filter((page) => page.indexable).map((page) => page.route)),
  );
  files = upsert(
    files,
    "app/page.tsx",
    authorityHomepageSource({
      artifactId: input.artifactId,
      experimentId: input.experimentId,
      ventureId: input.ventureId,
      candidateId: input.candidateId,
      page: mustPage(input.architecture.pages, "/"),
    }),
  );
  files = upsert(files, "app/how-it-works/page.tsx", howItWorksPageSource(mustPage(input.architecture.pages, "/how-it-works")));
  files = upsert(files, "app/compare-commercial-leases/page.tsx", comparePageSource(mustPage(input.architecture.pages, "/compare-commercial-leases")));
  files = upsert(files, "app/pricing/page.tsx", pricingPageSource(mustPage(input.architecture.pages, "/pricing")));
  files = upsert(files, "app/resources/page.tsx", resourcesPageSource(mustPage(input.architecture.pages, "/resources")));
  files = upsert(files, "app/faq/page.tsx", faqPageSource(mustPage(input.architecture.pages, "/faq")));
  files = upsert(files, "app/commercial-lease-npv/page.tsx", educationalPageSource(mustPage(input.architecture.pages, "/commercial-lease-npv"), npvPageBody()));
  files = upsert(files, "app/tenant-improvement-allowance/page.tsx", educationalPageSource(mustPage(input.architecture.pages, "/tenant-improvement-allowance"), tiPageBody()));
  files = upsert(files, "app/discount-rate-sensitivity/page.tsx", educationalPageSource(mustPage(input.architecture.pages, "/discount-rate-sensitivity"), discountPageBody()));
  files = upsert(files, "app/early-access/layout.tsx", conversionLayoutSource(mustPage(input.architecture.pages, "/early-access")));
  const privacy = files.find((item) => item.path.replace(/\\/g, "/") === "app/privacy-policy/page.tsx");
  if (privacy) privacy.content = legalMetadataSource(mustPage(input.architecture.pages, "/privacy-policy"), privacy.content);
  const terms = files.find((item) => item.path.replace(/\\/g, "/") === "app/terms-of-service/page.tsx");
  if (terms) terms.content = legalMetadataSource(mustPage(input.architecture.pages, "/terms-of-service"), terms.content);
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ingest.content.replace(/export const VALIDATION_ARTIFACT_ID = "[^"]+"/, `export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)}`);
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = PREMIUM_AUTHORITY_SITE_ARTIFACT_CONTRACT;
      parsed.qualityTarget = input.context.qualityTarget;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest ?? null,
        repairReason: PREMIUM_AUTHORITY_SITE_REPAIR_REASON,
        generationContract: PREMIUM_AUTHORITY_SITE_ARTIFACT_CONTRACT,
        siteArchitectureVersion: VENTURE_SITE_ARCHITECTURE_VERSION,
        contentArchitectureVersion: CONTENT_ARCHITECTURE_VERSION,
        designSystemVersion: DESIGN_SYSTEM_VERSION,
      };
      manifest.content = JSON.stringify(parsed, null, 2);
    } catch {
      // keep
    }
  }
  const provenance = {
    designDirection: direction,
    tokens,
    composition,
    creativeAssetPlan: creative,
    architecture: input.architecture,
    graph: input.graph,
    evidence: input.evidence,
    qualityTarget: input.context.qualityTarget,
  };
  files = upsert(files, "authority-site-provenance.json", JSON.stringify(provenance, null, 2));
  files = upsert(files, "components/premium-venture.tsx", premiumVenturePrimitivesSource());
  const quality = auditPremiumAuthoritySite({ files, pages: input.architecture.pages, graph: input.graph });
  const links = auditInternalLinks(files, input.architecture.pages);
  const contentReport = input.architecture.pages.map((page) => {
    const report = reportFor(files, page, input.evidence);
    report.inboundLinks = links.inbound[page.route] ?? 0;
    report.outboundLinks = links.outbound[page.route] ?? report.outboundLinks;
    return report;
  });
  return { files, quality, contentReport };
}

function mustPage(pages: PlannedPage[], route: string): PlannedPage {
  const page = pages.find((item) => item.route === route);
  if (!page) throw new Error(`planned_page_missing:${route}`);
  return page;
}

function reportFor(files: Array<{ path: string; content: string }>, page: PlannedPage, evidence: ContentEvidence[]): PageContentReport {
  const content = files.find((item) => item.path.replace(/\\/g, "/") === pageFile(page.route))?.content ?? "";
  const hrefs = [...content.matchAll(/href=["'](\/[^"']+)["']/g)].map((match) => match[1]);
  return {
    route: page.route,
    title: page.title,
    pageRole: page.role,
    primaryPurpose: page.metaDescription,
    wordCount: wordCountOf(content),
    sourceCount: evidence.filter((item) => item.page === page.route).length,
    inboundLinks: 0,
    outboundLinks: hrefs.length,
    schemaTypes: page.schemaTypes,
    designPattern: page.patternId,
    quality: wordCountOf(content) >= 80 || page.role === "CONVERSION" || page.role === "LEGAL" ? "PASS" : "FAIL",
  };
}

void planCreativeAssets;
