import type { BuildSpecification } from "@/lib/infinity/build-factory/types";
import { PROHIBITED_BUILD_ACTIONS } from "@/lib/infinity/build-factory/constants";
import { WEBSITE_BUILDER_VERSION } from "./constants";
import { buildNavigation, defaultPagesForProjectType } from "./page-models";
import type { WebsiteBuildExtension, WebsiteFramework } from "./types";
import { isWebsiteV1ProjectType } from "./types";

function resolveFramework(projectType: WebsiteBuildExtension["projectType"]): WebsiteFramework {
  if (projectType === "nextjs_website") {
    return "nextjs";
  }
  return "static";
}

export function enrichSpecificationWithWebsite(
  spec: BuildSpecification,
): BuildSpecification & { website?: WebsiteBuildExtension } {
  if (!isWebsiteV1ProjectType(spec.projectType)) {
    return spec;
  }

  const projectType = spec.projectType;
  const pages = defaultPagesForProjectType(projectType, spec.name, spec.requiredPages);
  const website: WebsiteBuildExtension = {
    schemaVersion: WEBSITE_BUILDER_VERSION,
    siteName: spec.name,
    siteDescription: spec.description || "[CONTENT REQUIRED]",
    projectType,
    framework: resolveFramework(projectType),
    routeStrategy: resolveFramework(projectType) === "nextjs" ? "app_router" : "file_based",
    pageDefinitions: pages,
    navigation: buildNavigation(pages),
    footer: {
      notice: "Internal website source — not deployed.",
      links: [{ label: "Privacy", href: "/privacy" }],
    },
    brandingTokens: { siteName: spec.name },
    typographyTokens: { stack: "system-ui" },
    spacingTokens: { base: "1rem" },
    componentDefinitions: [
      "Header",
      "Navigation",
      "Footer",
      "Hero",
      "ContentSection",
      "FeatureGrid",
      "CTASection",
      "Card",
      "TestimonialPlaceholder",
      "FAQSection",
      "ContactFormPlaceholder",
      "Breadcrumbs",
      "ArticleLayout",
      "ComparisonTable",
      "LegalNotice",
    ],
    contentSections: spec.contentRequirements.slice(0, 10),
    callsToAction: [spec.valueProposition || "[CONTENT REQUIRED]"],
    forms: [{ id: "contact", purpose: "lead_capture", externalSubmit: false }],
    metadata: { generator: WEBSITE_BUILDER_VERSION },
    schemaRequirements: ["WebSite", "WebPage"],
    accessibilityRequirements: spec.accessibilityRequirements,
    performanceRequirements: spec.performanceRequirements,
    analyticsPlaceholders: ["[ANALYTICS NOT CONFIGURED]"],
    integrationPlaceholders: ["[INTEGRATION NOT CONFIGURED]"],
    prohibitedFeatures: [...PROHIBITED_BUILD_ACTIONS, "external_form_post", "fake_social_proof"],
  };

  return { ...spec, website };
}

export function parseWebsiteExtension(
  spec: BuildSpecification & { website?: WebsiteBuildExtension },
): WebsiteBuildExtension | null {
  if (spec.website) {
    return spec.website;
  }
  const raw = spec as unknown as Record<string, unknown>;
  if (raw.website && typeof raw.website === "object") {
    return raw.website as WebsiteBuildExtension;
  }
  if (!isWebsiteV1ProjectType(spec.projectType)) {
    return null;
  }
  return enrichSpecificationWithWebsite(spec).website ?? null;
}
