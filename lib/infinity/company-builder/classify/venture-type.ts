import type { VentureType } from "../constants";
import type { LoadedVentureSelectionHandoff } from "../types";

export function classifyVentureTypes(handoff: LoadedVentureSelectionHandoff): {
  primary: VentureType;
  secondary: VentureType[];
} {
  const haystack = [
    handoff.businessConcept,
    handoff.recommendedProductType,
    handoff.primaryMonetizationModel,
    ...(handoff.businessModelCandidates ?? []),
    ...(handoff.secondaryRevenueStreams ?? []),
    handoff.solution,
  ]
    .join(" ")
    .toLowerCase();

  const secondary = new Set<VentureType>();

  const add = (type: VentureType) => {
    if (type !== "hybrid") secondary.add(type);
  };

  if (/saas|subscription|software.?as.?a.?service/.test(haystack)) add("saas");
  if (/api|developer platform/.test(haystack)) add("api_business");
  if (/data product|analytics|dataset|benchmark/.test(haystack)) add("data_product");
  if (/marketplace|two.?sided|platform fee|commission/.test(haystack)) add("marketplace");
  if (/creator|artist|ugc|community/.test(haystack)) {
    add("community");
    add("creator_marketplace");
  }
  if (/ecommerce|store|cart|checkout|inventory|retail/.test(haystack)) add("ecommerce");
  if (/affiliate|commission content|referral link/.test(haystack)) add("affiliate_site");
  if (/lead gen|lead generation|qualified lead/.test(haystack)) add("lead_generation");
  if (/content|blog|seo|geo|editorial|media/.test(haystack)) add("content_site");
  if (/newsletter|email list/.test(haystack)) add("newsletter");
  if (/directory|listing site/.test(haystack)) add("directory");
  if (/digital product|download|template|course/.test(haystack)) add("digital_product");
  if (/membership|member-only/.test(haystack)) add("membership");
  if (/comparison|versus|ranking engine/.test(haystack)) add("comparison_engine");
  if (/research platform|survey|insights platform/.test(haystack)) add("research_platform");
  if (/mobile app|ios|android/.test(haystack)) add("mobile_application");
  if (/print on demand|pod/.test(haystack)) add("print_on_demand");
  if (/job board|hiring marketplace/.test(haystack)) add("job_board");
  if (/service plus|software plus service|hybrid service/.test(haystack)) add("software_service_hybrid");

  let primary: VentureType = "hybrid";

  if (/^lead_gen|lead generation|lead_generation/.test(handoff.primaryMonetizationModel.toLowerCase())) primary = "lead_generation";
  else if (/saas|subscription platform|analytics platform/.test(haystack)) primary = "saas";
  else if (/two.?sided marketplace|buyer.*seller|supplier.*buyer/.test(haystack)) primary = "two_sided_marketplace";
  else if (/marketplace|platform fee|commission on transaction/.test(haystack)) primary = "marketplace";
  else if (/ecommerce|online store|reverse logistics|fraud prevention saas/.test(haystack)) primary = /saas|software/.test(haystack) ? "saas" : "ecommerce";
  else if (/lead gen|lead generation/.test(haystack)) primary = "lead_generation";
  else if (/affiliate/.test(haystack)) primary = "affiliate_site";
  else if (/content site|seo|geo analytics/.test(haystack)) primary = /saas|analytics/.test(haystack) ? "saas" : "content_site";
  else if (/data product|analytics/.test(haystack)) primary = "data_product";
  else if (/community|creator/.test(haystack)) primary = "creator_marketplace";
  else if (secondary.size === 1) primary = [...secondary][0]!;
  else if (secondary.size > 1) primary = "hybrid";

  secondary.delete(primary);

  return { primary, secondary: [...secondary] };
}

export function isContentHeavy(types: VentureType[]): boolean {
  return types.some((type) =>
    ["content_site", "affiliate_site", "lead_generation", "media_business", "newsletter", "comparison_engine"].includes(type),
  );
}

export function isMarketplace(types: VentureType[]): boolean {
  return types.some((type) =>
    ["marketplace", "two_sided_marketplace", "creator_marketplace", "job_board"].includes(type),
  );
}

export function isSaas(types: VentureType[]): boolean {
  return types.some((type) => ["saas", "web_application", "data_product", "api_business", "research_platform"].includes(type));
}
