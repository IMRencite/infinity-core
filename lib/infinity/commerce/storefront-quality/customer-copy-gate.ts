export const CUSTOMER_COPY_GATE = "CustomerCopyGate" as const;

const FORBIDDEN = [
  /ready to review/i,
  /checkout is not open/i,
  /color on the floor today/i,
  /when more garments land/i,
  /provider ready/i,
  /product state/i,
  /inventory record/i,
  /review this item/i,
  /\breview only\b/i,
  /checkout is closed/i,
  /\b\d+\s+ready\b/i,
  /filter by collection as more/i,
  /\boperators?\b/i,
  /test environment/i,
  /placeholder copy|placeholder statement|lorem ipsum/i,
  /qc passed/i,
  /geometry blocked/i,
];

export function evaluateCustomerCopyGate(copy: string): {
  gate: typeof CUSTOMER_COPY_GATE;
  result: "PASS" | "FAIL";
  hits: string[];
  reasons: string[];
} {
  const hits = FORBIDDEN.filter((pattern) => pattern.test(copy)).map((pattern) => pattern.source);
  return {
    gate: CUSTOMER_COPY_GATE,
    result: hits.length ? "FAIL" : "PASS",
    hits,
    reasons: hits.length ? hits.map((row) => `INTERNAL_OR_TEST_LANGUAGE:${row}`) : ["CUSTOMER_VOICE"],
  };
}
