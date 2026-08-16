import type { PageOpportunity, SchemaRecommendation, VentureOrganicContext } from "../types";

export function recommendSchema(
  opportunity: PageOpportunity,
  context: VentureOrganicContext,
  breadcrumbPath: string[],
): SchemaRecommendation {
  const domain = context.domain ?? "example.com";
  const schemaTypes: string[] = ["WebPage", "BreadcrumbList"];
  const entityReferences: string[] = [`https://${domain}/#organization`, `https://${domain}/#website`];
  const fields: Record<string, unknown> = {
    "@context": "https://schema.org",
    breadcrumb: breadcrumbPath,
  };
  let rationale = "Base WebPage and breadcrumb schema from visible hierarchy";

  if (opportunity.pageType === "homepage") {
    schemaTypes.push("Organization", "WebSite");
    fields.searchAction = false;
    rationale = "Homepage receives Organization and WebSite where business identity is truthful";
  }

  if (opportunity.pageType === "question") {
    schemaTypes.push("FAQPage");
    fields.mainEntity = "Question/Answer pairs derived from on-page content only";
    rationale = "FAQ schema only when page contains genuine Q&A content";
  }

  if (opportunity.pageType === "product" || opportunity.pageType === "category") {
    schemaTypes.push(opportunity.pageType === "product" ? "Product" : "CollectionPage");
    rationale = "Product/Collection schema only when verified offer/product data exists";
  }

  if (opportunity.pageType === "service" || opportunity.pageType === "transactional_landing_page") {
    schemaTypes.push("Service");
    rationale = "Service schema for service pages without fabricating LocalBusiness locations";
  }

  if (opportunity.geographicContext?.city || opportunity.geographicContext?.neighborhood) {
    schemaTypes.push("Place");
    if (opportunity.pageType === "service" && hasVerifiedPhysicalLocation(context)) {
      schemaTypes.push("LocalBusiness");
      rationale = "LocalBusiness only when verified physical location qualifies";
    } else {
      rationale = "Geographic pages use Place/Service/WebPage — no fabricated LocalBusiness addresses";
    }
  }

  if (opportunity.pageType === "comparison" || opportunity.pageType === "article" || opportunity.pageType === "guide") {
    schemaTypes.push("Article");
    rationale = "Article schema for editorial/comparison resources with truthful authorship when available";
  }

  const requirementsSatisfied = !schemaTypes.includes("LocalBusiness") || hasVerifiedPhysicalLocation(context);
  const sanitizedTypes = requirementsSatisfied
    ? schemaTypes
    : schemaTypes.filter((t) => t !== "LocalBusiness");

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    schemaTypes: [...new Set(sanitizedTypes)],
    entityReferences,
    fields: sanitizeSchemaFields(fields, sanitizedTypes),
    rationale,
    requirementsSatisfied,
  };
}

function hasVerifiedPhysicalLocation(context: VentureOrganicContext): boolean {
  const locations = context.contentArchitecture?.verifiedPhysicalLocations;
  return Array.isArray(locations) && locations.length > 0;
}

function sanitizeSchemaFields(fields: Record<string, unknown>, types: string[]): Record<string, unknown> {
  const out = { ...fields };
  if (!types.includes("Product")) {
    delete out.offers;
    delete out.price;
    delete out.availability;
  }
  if (!types.includes("LocalBusiness")) {
    delete out.address;
    delete out.telephone;
    delete out.openingHours;
  }
  if (!types.includes("FAQPage")) {
    delete out.mainEntity;
  }
  return out;
}

export function recommendSchemas(
  opportunities: PageOpportunity[],
  context: VentureOrganicContext,
  urlEntries: Array<{ pageOpportunityId: string; breadcrumbPath: string[] }>,
): SchemaRecommendation[] {
  const breadcrumbMap = new Map(urlEntries.map((e) => [e.pageOpportunityId, e.breadcrumbPath]));
  return opportunities.map((opp) =>
    recommendSchema(opp, context, breadcrumbMap.get(opp.pageOpportunityId) ?? ["Home"]),
  );
}

export function countFabricatedLocalBusiness(recommendations: SchemaRecommendation[]): number {
  return recommendations.filter(
    (r) => r.schemaTypes.includes("LocalBusiness") && !r.requirementsSatisfied,
  ).length;
}
