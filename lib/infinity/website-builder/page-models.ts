import { CONTENT_MARKERS, MAX_SAMPLE_CONTENT_RECORDS } from "./constants";
import type { WebsiteBuildExtension, WebsitePageDefinition, WebsitePageType } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function pageFromRequired(
  label: string,
  pageType: WebsitePageType,
  purpose: string,
): WebsitePageDefinition {
  const slug = pageType === "home" ? "" : slugify(label) || pageType;
  return {
    slug,
    pageType,
    title: label || pageType,
    description: purpose,
    purpose,
    sections: ["hero", "content"],
    primaryCTA: CONTENT_MARKERS.contentRequired,
    contentStatus: "placeholder",
    validationRequirements: ["single_h1", "landmarks"],
    internalLinks: [],
  };
}

export function defaultPagesForProjectType(
  projectType: WebsiteBuildExtension["projectType"],
  siteName: string,
  requiredPages: string[],
): WebsitePageDefinition[] {
  const base: WebsitePageDefinition[] = [
    {
      slug: "",
      pageType: "home",
      title: siteName,
      description: CONTENT_MARKERS.contentRequired,
      purpose: "Primary entry page",
      sections: ["hero", "features", "cta"],
      primaryCTA: CONTENT_MARKERS.contentRequired,
      contentStatus: "placeholder",
      validationRequirements: ["single_h1"],
    },
    pageFromRequired("About", "about", "Organization overview"),
    pageFromRequired("Contact", "contact", "Contact and inquiries"),
  ];

  if (projectType === "content_site") {
    base.push(pageFromRequired("Articles", "category", "Content category index"));
    for (let i = 0; i < Math.min(MAX_SAMPLE_CONTENT_RECORDS, requiredPages.length); i += 1) {
      const title = requiredPages[i] ?? `Sample topic ${i + 1}`;
      base.push({
        slug: slugify(title),
        pageType: "article",
        title,
        description: CONTENT_MARKERS.contentRequired,
        purpose: "Sample article framework (spec-derived)",
        sections: ["article"],
        contentStatus: "placeholder",
        validationRequirements: ["single_h1"],
      });
    }
  }

  if (projectType === "lead_generation_site") {
    base.push(pageFromRequired("Services", "service", "Service offering placeholder"));
    base.push({
      slug: "locations",
      pageType: "landing",
      title: "Locations",
      description: CONTENT_MARKERS.contactRequired,
      purpose: "Location page template",
      sections: ["hero", "locations"],
      contentStatus: "placeholder",
      validationRequirements: ["single_h1"],
    });
    base.push({
      slug: "privacy",
      pageType: "legal_placeholder",
      title: "Privacy",
      description: CONTENT_MARKERS.legalReview,
      purpose: "Privacy placeholder",
      sections: ["legal"],
      contentStatus: "placeholder",
    });
  }

  if (projectType === "affiliate_site") {
    base.push(pageFromRequired("Categories", "category", "Product categories"));
    base.push({
      slug: "comparison",
      pageType: "comparison",
      title: "Comparison",
      description: CONTENT_MARKERS.pricingNotConfigured,
      purpose: "Comparison template",
      sections: ["comparison"],
      contentStatus: "placeholder",
    });
    base.push({
      slug: "review-sample",
      pageType: "product",
      title: "Product review template",
      description: CONTENT_MARKERS.contentRequired,
      purpose: "Review template without fabricated ratings",
      sections: ["review"],
      contentStatus: "placeholder",
    });
  }

  for (const label of requiredPages.slice(0, 5)) {
    const slug = slugify(label);
    if (!slug || base.some((p) => p.slug === slug)) continue;
    base.push(pageFromRequired(label, "custom", `Page: ${label}`));
  }

  return base;
}

export function buildNavigation(pages: WebsitePageDefinition[]): WebsiteBuildExtension["navigation"] {
  return pages
    .filter((p) => p.pageType !== "legal_placeholder" || p.slug === "privacy")
    .slice(0, 8)
    .map((p) => ({
      label: p.title,
      href: p.slug ? `/${p.slug}` : "/",
    }));
}
