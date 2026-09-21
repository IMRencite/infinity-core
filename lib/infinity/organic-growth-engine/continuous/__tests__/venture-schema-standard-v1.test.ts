import { describe, expect, it } from "vitest";
import { BUILD_PROJECT_TEMPLATES } from "@/lib/infinity/build-factory/templates/definitions";
import { generateOrganicDraft } from "../cycle";
import { occupancynpvBlogArticleSchema, occupancynpvBlogArticleSource, occupancynpvBlogIndexSchema } from "../occupancynpv-blog";
import { occupancynpvCapRateFaqs, occupancynpvLiveCapRateCrumbs, occupancynpvLiveCapRatePageSource, occupancynpvLiveCapRateSchema } from "../occupancynpv-live-page";
import { authorizeOrganicPublish } from "../publish";
import {
  auditOccupancyNpvSchemaCatalog,
  buildConnectedSchemaGraph,
  classifyPageSchema,
  defaultVentureSchemaSurface,
  evaluateDraftSchemaStack,
  evaluateOrganicSchemaStackGate,
  evaluateVentureSchemaReadinessGate,
  occupancynpvOrganization,
  schemaClassificationCounts,
  schemaRemediationQueue,
  schemaTypeRouter,
  VENTURE_SCHEMA_STANDARD,
} from "../schema-standard";
import { defaultVentureBlogSurface, evaluateVentureBlogReadinessGate, provisionBuildFactoryBlogFiles } from "../venture-blog-standard";

function typesOf(graph: Record<string, unknown>): string[] {
  return ((graph["@graph"] as Array<Record<string, unknown>>) ?? []).flatMap((node) =>
    Array.isArray(node["@type"]) ? node["@type"].map(String) : [String(node["@type"])],
  );
}

describe("Venture schema standard", () => {
  it("routes page kinds and builds a connected stable graph", () => {
    expect(VENTURE_SCHEMA_STANDARD).toBe("VentureSchemaStandard");
    expect(schemaTypeRouter("EVERGREEN_RESOURCE")).toEqual(expect.arrayContaining(["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification"]));
    expect(schemaTypeRouter("BLOG_ARTICLE")).toContain("BlogPosting");
    expect(schemaTypeRouter("BLOG_INDEX")).toContain("CollectionPage");
    expect(schemaTypeRouter("BLOG_INDEX")).not.toContain("BlogPosting");
    const graph = occupancynpvLiveCapRateSchema();
    expect(graph["@context"]).toBe("https://schema.org");
    const ids = ((graph["@graph"] as Array<Record<string, unknown>>) ?? []).map((node) => String(node["@id"]));
    expect(ids).toContain("https://occupancynpv.com/#organization");
    expect(ids).toContain("https://occupancynpv.com/#website");
    expect(ids.some((id) => id.endsWith("#webpage"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(typesOf(graph)).toEqual(expect.arrayContaining(["Organization", "WebSite", "WebPage", "Article", "BreadcrumbList", "SpeakableSpecification", "FAQPage"]));
  });

  it("passes OccupancyNPV organic pages and rejects a blog index marked BlogPosting", () => {
    const cap = occupancynpvLiveCapRateSchema();
    const html = occupancynpvLiveCapRatePageSource();
    const capInput = {
      origin: "https://occupancynpv.com",
      organization: occupancynpvOrganization(),
      page: {
        kind: "EVERGREEN_RESOURCE" as const,
        url: "/commercial-lease-npv/how-is-cap-rate-calculated/",
        canonical: "/commercial-lease-npv/how-is-cap-rate-calculated/",
        title: "How is cap rate calculated? — OccupancyNPV",
        description: "Cap rate equals NOI divided by value.",
        breadcrumbs: occupancynpvLiveCapRateCrumbs(),
        speakable_css_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
        faqs: occupancynpvCapRateFaqs(),
        visible_faqs: occupancynpvCapRateFaqs(),
        date_published: "2026-09-17",
        date_modified: "2026-09-17",
        html,
        link_canonical: "/commercial-lease-npv/how-is-cap-rate-calculated/",
        about: ["capitalization rate"],
        mentions: ["commercial lease NPV"],
      },
    };
    expect(evaluateOrganicSchemaStackGate(capInput, cap).result).toBe("PASS");
    expect(evaluateOrganicSchemaStackGate({
      origin: "https://occupancynpv.com",
      organization: occupancynpvOrganization(),
      page: {
        kind: "BLOG_INDEX",
        url: "/blog/",
        canonical: "/blog/",
        title: "Blog",
        description: "Editorial notes",
        breadcrumbs: [
          { name: "Home", item: "/" },
          { name: "Blog", item: "/blog/" },
        ],
        link_canonical: "/blog/",
      },
    }, occupancynpvBlogIndexSchema()).result).toBe("PASS");
    expect(typesOf(occupancynpvBlogIndexSchema())).not.toContain("BlogPosting");
    expect(typesOf(occupancynpvBlogArticleSchema())).toContain("BlogPosting");
    expect(occupancynpvBlogArticleSource()).toContain("id=\"direct-answer\"");
    const conflict = buildConnectedSchemaGraph({
      origin: "https://occupancynpv.com",
      organization: occupancynpvOrganization(),
      page: {
        kind: "BLOG_ARTICLE",
        url: "/blog/",
        canonical: "/blog/",
        title: "Blog",
        description: "Editorial notes",
        breadcrumbs: [
          { name: "Home", item: "/" },
          { name: "Blog", item: "/blog/" },
        ],
      },
    });
    expect(classifyPageSchema({
      graph: occupancynpvBlogIndexSchema(),
      stack: evaluateOrganicSchemaStackGate({
        origin: "https://occupancynpv.com",
        organization: occupancynpvOrganization(),
        page: {
          kind: "BLOG_INDEX",
          url: "/blog/",
          canonical: "/blog/",
          title: "Blog",
          description: "Editorial notes",
          breadcrumbs: [
            { name: "Home", item: "/" },
            { name: "Blog", item: "/blog/" },
          ],
        },
      }, occupancynpvBlogIndexSchema()),
    })).toBe("SCHEMA_COMPLETE");
    expect(typesOf(conflict)).toContain("BlogPosting");
  });

  it("requires schema infrastructure before launch and extends blog + Build Factory", () => {
    expect(evaluateVentureSchemaReadinessGate(null).result).toBe("FAIL");
    expect(evaluateVentureSchemaReadinessGate(defaultVentureSchemaSurface()).result).toBe("PASS");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    }).result).toBe("PASS");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: { ...defaultVentureBlogSurface("occupancynpv"), schema: ["WebPage"] },
    }).result).toBe("FAIL");
    const files = provisionBuildFactoryBlogFiles();
    expect(files["lib/site-schema.ts"]).toContain("SITE_SCHEMA");
    expect(files["lib/schema/venture-schema.ts"]).toContain("page_composer");
    expect(BUILD_PROJECT_TEMPLATES["nextjs-site-basic"].supportedCapabilities).toContain("website.provision_schema_stack");
  });

  it("blocks publish without the schema stack and queues remediations", () => {
    const draft = generateOrganicDraft({
      question: "How is cap rate calculated?",
      topic: "Cap Rates",
      url: "/commercial-real-estate/valuation/how-is-cap-rate-calculated/",
      links: ["/commercial-real-estate/valuation/", "/"],
      breadcrumbs: ["Commercial Real Estate", "Valuation", "How is cap rate calculated"],
    });
    const schema = evaluateDraftSchemaStack(draft);
    expect(schema.stack.result).toBe("PASS");
    expect(authorizeOrganicPublish({
      venture_active: true,
      website_approved: true,
      publishing_enabled: true,
      quality: { gate: "q", result: "PASS", reasons: [] },
      duplicate: { result: "PASS" },
      url: { gate: "u", result: "PASS", reasons: [] },
      evidence: { gate: "e", result: "PASS", reasons: [] },
      links: { gate: "l", result: "PASS", reasons: [] },
      schema: schema.stack,
      velocity_available: true,
      schema_stack: schema.gates,
    }).result).toBe("PASS");
    expect(authorizeOrganicPublish({
      venture_active: true,
      website_approved: true,
      publishing_enabled: true,
      quality: { gate: "q", result: "PASS", reasons: [] },
      duplicate: { result: "PASS" },
      url: { gate: "u", result: "PASS", reasons: [] },
      evidence: { gate: "e", result: "PASS", reasons: [] },
      links: { gate: "l", result: "PASS", reasons: [] },
      schema: { gate: "OrganicSchemaStackGate", result: "FAIL", reasons: ["missing_organization"] },
      velocity_available: true,
    }).result).toBe("FAIL");
    const counts = schemaClassificationCounts();
    expect(counts.SCHEMA_COMPLETE).toBeGreaterThanOrEqual(3);
    expect(schemaRemediationQueue().every((row) => row.classification !== "SCHEMA_COMPLETE")).toBe(true);
    expect(auditOccupancyNpvSchemaCatalog().some((row) => row.url.includes("how-is-cap-rate-calculated") && row.classification === "SCHEMA_COMPLETE")).toBe(true);
  });
});
