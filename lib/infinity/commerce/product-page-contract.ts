export const PRODUCT_PAGE_CONTRACT = "ProductPageContract" as const;
export const PRODUCT_PAGE_CONTRACT_VERSION = "product-page-contract-v1" as const;

export const PRODUCT_PAGE_REQUIRED_REGIONS = [
  "breadcrumbs",
  "gallery",
  "title",
  "price",
  "availability",
  "color",
  "size",
  "variant_selector",
  "quantity",
  "cart_cta",
  "description",
  "design_story",
  "specs",
  "fit",
  "size_guide",
  "care",
  "shipping",
  "returns",
  "related",
  "schema",
] as const;

export function evaluateProductPageContract(html: string): {
  gate: typeof PRODUCT_PAGE_CONTRACT;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!/breadcrumb/i.test(html)) reasons.push("missing_breadcrumbs");
  if (!/gallery|product-media|data-product-gallery/.test(html)) reasons.push("missing_gallery");
  if (!/<h1/.test(html)) reasons.push("missing_title");
  if (!/price|Price pending/.test(html)) reasons.push("missing_price");
  if (!/size|Size/.test(html)) reasons.push("missing_size");
  if (!/Add to cart|cart|Checkout is launching/.test(html)) reasons.push("missing_cta");
  if (!/shipping|returns|care|fit/i.test(html)) reasons.push("missing_detail_modules");
  return { gate: PRODUCT_PAGE_CONTRACT, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateProductCardContract(html: string): {
  gate: "ProductCard";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (/garmentWithPrintSvg|product-core-garment|product-kickstands-up-garment/.test(html)) {
    reasons.push("HOMEMADE_GARMENT_ON_CARD");
  }
  if (/KICKSTANDS UP|CT<\/text>/.test(html)) reasons.push("KNOWN_BAD_PRODUCT_VISUAL");
  return { gate: "ProductCard", result: reasons.length ? "FAIL" : "PASS", reasons };
}
