import {
  CONTENT_ARCHITECTURE_VERSION,
  DESIGN_SYSTEM_VERSION,
  DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON,
  DIRECT_RESPONSE_AUTHORITY_SITE_CONTRACT,
  VENTURE_SITE_ARCHITECTURE_VERSION,
} from "./constants";
import { composePremiumAuthoritySiteArtifact } from "./compose-authority-artifact";
import { conversionLayoutSource } from "./page-sources";
import {
  successorCompareSource,
  expandEarlyAccessPage,
  successorFaqSource,
  successorHomepageSource,
  successorHowItWorksSource,
  successorPricingSource,
} from "./page-sources-successor";
import {
  successorDiscountSource,
  successorNpvSource,
  successorResourcesSource,
  successorTiSource,
} from "./page-sources-successor-authority";
import {
  successorCamSource,
  successorEscalationsSource,
  successorFreeRentSource,
  successorGrossNetSource,
  successorPersonaSource,
} from "./page-sources-successor-spokes";
import { auditInternalLinks, auditPremiumAuthoritySite, wordCountOf } from "./quality-gates";
import { buildPageSchema } from "./schema-builder";
import { siteSchemaModule } from "./site-chrome";
import type { ComposeAuthorityInput, Gate, PageContentReport, PlannedPage } from "./types";

function upsert(files: Array<{ path: string; content: string }>, path: string, content: string): Array<{ path: string; content: string }> {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function pageFile(route: string): string {
  return route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
}

function mustPage(pages: PlannedPage[], route: string): PlannedPage {
  const page = pages.find((item) => item.route === route);
  if (!page) throw new Error(`planned_page_missing:${route}`);
  return page;
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

export function composeDirectResponseAuthoritySiteArtifact(input: ComposeAuthorityInput): {
  files: Array<{ path: string; content: string }>;
  quality: ReturnType<typeof auditPremiumAuthoritySite>;
  contentReport: PageContentReport[];
} {
  const base = composePremiumAuthoritySiteArtifact(input);
  let files = base.files.map((item) => ({ ...item }));
  const pages = input.architecture.pages;
  files = upsert(files, "app/page.tsx", successorHomepageSource(mustPage(pages, "/"), { artifactId: input.artifactId, experimentId: input.experimentId }));
  files = upsert(files, "app/how-it-works/page.tsx", successorHowItWorksSource(mustPage(pages, "/how-it-works")));
  files = upsert(files, "app/compare-commercial-leases/page.tsx", successorCompareSource(mustPage(pages, "/compare-commercial-leases")));
  files = upsert(files, "app/pricing/page.tsx", successorPricingSource(mustPage(pages, "/pricing")));
  files = upsert(files, "app/resources/page.tsx", successorResourcesSource(mustPage(pages, "/resources")));
  files = upsert(files, "app/faq/page.tsx", successorFaqSource(mustPage(pages, "/faq")));
  files = upsert(files, "app/commercial-lease-npv/page.tsx", successorNpvSource(mustPage(pages, "/commercial-lease-npv")));
  files = upsert(files, "app/tenant-improvement-allowance/page.tsx", successorTiSource(mustPage(pages, "/tenant-improvement-allowance")));
  files = upsert(files, "app/discount-rate-sensitivity/page.tsx", successorDiscountSource(mustPage(pages, "/discount-rate-sensitivity")));
  files = upsert(files, "app/resources/cam-costs/page.tsx", successorCamSource(mustPage(pages, "/resources/cam-costs")));
  files = upsert(files, "app/resources/free-rent/page.tsx", successorFreeRentSource(mustPage(pages, "/resources/free-rent")));
  files = upsert(files, "app/resources/rent-escalations/page.tsx", successorEscalationsSource(mustPage(pages, "/resources/rent-escalations")));
  files = upsert(files, "app/resources/gross-vs-net-lease/page.tsx", successorGrossNetSource(mustPage(pages, "/resources/gross-vs-net-lease")));
  files = upsert(files, "app/for/tenant-rep-brokers/page.tsx", successorPersonaSource(mustPage(pages, "/for/tenant-rep-brokers")));
  files = upsert(files, "app/early-access/layout.tsx", conversionLayoutSource(mustPage(pages, "/early-access")));
  const early = files.find((item) => item.path.replace(/\\/g, "/") === "app/early-access/page.tsx");
  if (early) early.content = expandEarlyAccessPage(early.content);
  const schemaByRoute: Record<string, unknown> = {};
  for (const page of pages) {
    const extra =
      page.route === "/faq"
        ? { faq: FAQ_PAGE }
        : page.route === "/commercial-lease-npv"
          ? { faq: FAQ_NPV }
          : page.route === "/compare-commercial-leases"
            ? { faq: FAQ_COMPARE }
            : {};
    schemaByRoute[page.route] = buildPageSchema(page, extra);
  }
  files = upsert(files, "lib/site-schema.ts", siteSchemaModule(schemaByRoute));
  const ingest = files.find((item) => item.path.replace(/\\/g, "/") === "app/ingest-client.ts");
  if (ingest) {
    ingest.content = ingest.content.replace(/export const VALIDATION_ARTIFACT_ID = "[^"]+"/, `export const VALIDATION_ARTIFACT_ID = ${JSON.stringify(input.artifactId)}`);
  }
  const manifest = files.find((item) => item.path.replace(/\\/g, "/") === "artifact-manifest.json");
  if (manifest) {
    try {
      const parsed = JSON.parse(manifest.content) as Record<string, unknown>;
      parsed.artifactId = input.artifactId;
      parsed.generationContract = DIRECT_RESPONSE_AUTHORITY_SITE_CONTRACT;
      parsed.qualityTarget = input.context.qualityTarget;
      parsed.lineage = {
        predecessorArtifactId: input.predecessorArtifactId,
        predecessorDigest: input.predecessorDigest ?? null,
        repairReason: DIRECT_RESPONSE_AUTHORITY_REPAIR_REASON,
        generationContract: DIRECT_RESPONSE_AUTHORITY_SITE_CONTRACT,
        siteArchitectureVersion: VENTURE_SITE_ARCHITECTURE_VERSION,
        contentArchitectureVersion: CONTENT_ARCHITECTURE_VERSION,
        designSystemVersion: DESIGN_SYSTEM_VERSION,
        urlMigrationsPerformed: [],
        futureSiloMigrationDocumented: true,
      };
      manifest.content = JSON.stringify(parsed, null, 2);
    } catch {
      // keep
    }
  }
  const quality = auditPremiumAuthoritySite({ files, pages, graph: input.graph });
  const links = auditInternalLinks(files, pages);
  const contentReport = pages.map((page) => {
    const content = files.find((item) => item.path.replace(/\\/g, "/") === pageFile(page.route))?.content ?? "";
    const hrefs = [...content.matchAll(/href=["'](\/[^"']+)["']/g)].map((match) => match[1]);
    return {
      route: page.route,
      title: page.title,
      pageRole: page.role,
      primaryPurpose: page.metaDescription,
      wordCount: wordCountOf(content),
      sourceCount: input.evidence.filter((item) => item.page === page.route).length,
      inboundLinks: links.inbound[page.route] ?? 0,
      outboundLinks: hrefs.length,
      schemaTypes: page.schemaTypes,
      designPattern: page.patternId,
      quality: (wordCountOf(content) >= 80 || page.role === "CONVERSION" || page.role === "LEGAL" ? "PASS" : "FAIL") as Gate,
    };
  });
  return { files, quality, contentReport };
}
