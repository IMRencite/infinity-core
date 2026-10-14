export const AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1 = "AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1" as const;

export type SafePublishActionClass =
  | "EDITORIAL_BLOG"
  | "EVERGREEN_GUIDE"
  | "FAQ_OR_GLOSSARY"
  | "COMMERCIAL_PAGE"
  | "GEO_PAGE"
  | "STOREFRONT_PRODUCT_LISTING"
  | "INTERNAL_LINK_UPDATE"
  | "METADATA_SCHEMA_UPDATE";

export function autonomousSafePublishAuthorityQc(input?: {
  manufacturing_authorized?: boolean;
  paid_media?: boolean;
  new_domain_purchase?: boolean;
}): "PASS" | "FAIL" {
  if (input?.manufacturing_authorized) return "FAIL";
  if (input?.paid_media) return "FAIL";
  if (input?.new_domain_purchase) return "FAIL";
  return "PASS";
}

export function isReversibleNoSpendPublishAction(action: SafePublishActionClass): boolean {
  return [
    "EDITORIAL_BLOG",
    "EVERGREEN_GUIDE",
    "FAQ_OR_GLOSSARY",
    "COMMERCIAL_PAGE",
    "GEO_PAGE",
    "STOREFRONT_PRODUCT_LISTING",
    "INTERNAL_LINK_UPDATE",
    "METADATA_SCHEMA_UPDATE",
  ].includes(action);
}

export function publishCandidateAllowed(input: {
  action: SafePublishActionClass;
  quality_gates_pass: boolean;
  venture_live: boolean;
  production_infrastructure: boolean;
}): boolean {
  if (!input.venture_live || !input.production_infrastructure) return false;
  if (!input.quality_gates_pass) return false;
  if (!isReversibleNoSpendPublishAction(input.action)) return false;
  return autonomousSafePublishAuthorityQc() === "PASS";
}
