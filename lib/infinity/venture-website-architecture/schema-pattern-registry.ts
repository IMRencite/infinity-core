import { SCHEMA_PATTERN_REGISTRY, SCHEMA_TYPES } from "./constants";
import type { PlannedPage, SchemaPattern, SchemaType } from "./types";

const PATTERNS: Record<SchemaType, SchemaPattern> = {
  WebSite: { schemaType: "WebSite", when: "Homepage or site-wide identity.", forbiddenUnless: "The page represents the public site." },
  WebPage: { schemaType: "WebPage", when: "Any indexable page.", forbiddenUnless: "A real public page exists." },
  Organization: {
    schemaType: "Organization",
    when: "Homepage operator attribution is truthful and minimal.",
    forbiddenUnless: "No invented founding date, employees, awards, or locations.",
  },
  SoftwareApplication: {
    schemaType: "SoftwareApplication",
    when: "The software is actually available as represented.",
    forbiddenUnless: "Do not use for an unvalidated proposed workflow.",
  },
  Product: { schemaType: "Product", when: "A real product entity is being described.", forbiddenUnless: "No fake SKUs or availability." },
  Offer: { schemaType: "Offer", when: "A real purchasable offer exists.", forbiddenUnless: "Validation pricing hypotheses are not Offers." },
  Article: { schemaType: "Article", when: "Editorial or educational pages with a distinct topic.", forbiddenUnless: "Not a thin doorway." },
  BlogPosting: { schemaType: "BlogPosting", when: "A dated editorial blog article, not a hub or index.", forbiddenUnless: "Do not mark a blog index as BlogPosting." },
  Service: { schemaType: "Service", when: "A real service offering page exists.", forbiddenUnless: "Do not fabricate services." },
  SpeakableSpecification: { schemaType: "SpeakableSpecification", when: "A concise visible answer target exists.", forbiddenUnless: "Do not mark the entire article, nav, footer, or tables." },
  FAQPage: { schemaType: "FAQPage", when: "Visible question and answer pairs exist on the page.", forbiddenUnless: "No fabricated Q&A." },
  HowTo: { schemaType: "HowTo", when: "The page is a genuine step-based process.", forbiddenUnless: "Do not force onto general education." },
  BreadcrumbList: { schemaType: "BreadcrumbList", when: "Visible breadcrumbs reflect actual hierarchy.", forbiddenUnless: "Hierarchy is real." },
  CollectionPage: { schemaType: "CollectionPage", when: "A hub lists real child pages.", forbiddenUnless: "Children exist." },
  ItemList: { schemaType: "ItemList", when: "A visible list of real items or child pages.", forbiddenUnless: "Items are on the page." },
};

export function schemaPatternRegistry(): Record<SchemaType, SchemaPattern> {
  void SCHEMA_PATTERN_REGISTRY;
  void SCHEMA_TYPES;
  return PATTERNS;
}

export function schemaTypesForPage(page: PlannedPage, faqVisible: boolean, howToSteps: boolean, softwareAvailable: boolean, offerPurchasable: boolean): SchemaType[] {
  const types = new Set<SchemaType>(page.schemaTypes);
  if (page.role === "HOMEPAGE") {
    types.add("WebSite");
    types.add("WebPage");
    types.add("Organization");
    types.delete("SoftwareApplication");
    types.delete("Offer");
  }
  if (page.role === "EDUCATIONAL_ARTICLE" || page.role === "QUESTION_PAGE") types.add("Article");
  if (page.role === "EDUCATIONAL_HUB") {
    types.add("CollectionPage");
    types.add("ItemList");
  }
  if (faqVisible && (page.role === "FAQ" || page.role === "QUESTION_PAGE" || page.role === "EDUCATIONAL_ARTICLE")) {
    types.add("FAQPage");
  } else {
    types.delete("FAQPage");
  }
  if (howToSteps && page.role === "HOW_IT_WORKS") types.add("HowTo");
  else types.delete("HowTo");
  if (!softwareAvailable) {
    types.delete("SoftwareApplication");
    types.delete("Product");
  }
  if (!offerPurchasable) types.delete("Offer");
  if (page.indexable && page.role !== "LEGAL") types.add("BreadcrumbList");
  types.add("WebPage");
  return [...types];
}
