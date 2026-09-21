export const OCCUPANCYNPV_LAUNCH_MESSAGING_REPAIR = "occupancynpv_launch_messaging_repair_v1" as const;

const STRING_REPLACEMENTS: Array<[string, string]> = [
  [
    "I am interested in a paid pilot if the product is built.",
    "I want controlled or pilot participation in the live OccupancyNPV product.",
  ],
  [
    "if the product is built",
    "for OccupancyNPV access",
  ],
  [
    "The pilot is an early validation conversation about a focused commercial lease comparison workflow. Participants should expect a discussion of current spreadsheet practice, not a finished product and not a checkout.",
    "OccupancyNPV is a live lease comparison and NPV product. This page is for controlled or pilot participation while public rollout remains controlled. Checkout is available on the pricing page.",
  ],
  [
    "Current product state is validation-stage. This site does not collect payment. Pricing hypotheses are $290 per year or $149 per deal.",
    "OccupancyNPV is live. Checkout is available on the pricing page for $290/year Professional and $149/deal Per-Deal. Public rollout remains controlled.",
  ],
  [
    "A bounded conversation about whether a cash-flow, NPV, and client-summary workspace would replace a rebuilt workbook. Current product state is validation-stage. This site does not collect payment.",
    "A conversation about using the live OccupancyNPV cash-flow, NPV, and in-workspace client-summary product. Checkout is available on the pricing page.",
  ],
  [
    "Request received. No payment was taken.",
    "Request received.",
  ],
  [
    "Pricing selection is interest, not a purchase. Payment is not collected.",
    "Checkout for Professional and Per-Deal is available on the pricing page.",
  ],
  [
    "Do not send SSNs, bank details, lease files, or other sensitive documents. Pricing selection is interest, not a purchase. Payment is not collected.",
    "Do not send SSNs, bank details, lease files, or other sensitive documents. Checkout for Professional and Per-Deal is available on the pricing page.",
  ],
  [
    "$290 per year or $149 per deal are hypotheses.",
    "Professional is $290 per year. Per-Deal is $149 per deal.",
  ],
  [
    "No. This is an early validation / pilot concept. It is not generally available, and this site does not collect payment.",
    "Yes. OccupancyNPV is a live lease comparison and NPV workspace with authenticated access. Checkout is available for Professional and Per-Deal.",
  ],
  [
    "No. This is an early validation / pilot concept and is not generally available.",
    "Yes. OccupancyNPV is a live lease comparison and NPV workspace. Public rollout remains controlled.",
  ],
  [
    "Payment is not collected on this site. Pricing hypotheses of $290 per year or $149 per deal are interest signals only.",
    "Yes. Live checkout is available on the pricing page for $290/year Professional and $149/deal Per-Deal.",
  ],
  [
    "No. Pricing shown is a hypothesis. A form selection indicates interest only. Payment is not collected.",
    "Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on the pricing page.",
  ],
  [
    "No. The proposed workflow is in validation. It is not generally available.",
    "Yes. OccupancyNPV is a working lease comparison product. Public rollout remains controlled.",
  ],
  [
    "The comparison workspace exists. Checkout is not open.",
    "The comparison workspace exists. Checkout is available on the pricing page.",
  ],
  [
    "Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report. Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.",
    "Professional is $290 per year for one authenticated seat. Per-Deal is $149 for one DealWorkspace. Live checkout is available on the pricing page.",
  ],
  [
    "Selecting an option indicates interest. Payment is not collected. Willingness to pay is not yet proven.",
    "Professional is $290 per year. Per-Deal is $149 per deal. Live checkout is available on the pricing page.",
  ],
  [
    "Payment is not collected. Willingness to pay is not yet proven.",
    "Professional is $290 per year. Per-Deal is $149 per deal.",
  ],
  [
    "This is a pilot context. The hidden cell cost of rebuilding a workbook is real; whether brokers will pay $290 or $149 is not proven. Payment is not collected. A selection is an interest signal only.",
    "These are the current OccupancyNPV offers. Professional is $290 per year. Per-Deal is $149 per deal. Checkout starts from the pricing page.",
  ],
  [
    "Pricing remains a hypothesis: $290 per year or $149 per deal. Payment is not collected. Willingness to pay is not proven.",
    "Current prices are $290 per year for Professional and $149 per deal for Per-Deal. Live checkout is available on the pricing page.",
  ],
  [
    "Pricing remains a hypothesis: $290 per year or $149 per deal. Payment is not collected.",
    "Current prices are $290 per year for Professional and $149 per deal for Per-Deal. Live checkout is available on the pricing page.",
  ],
  [
    "$290 per year or $149 per deal. Payment is not collected. Willingness to pay is not proven.",
    "Professional is $290 per year. Per-Deal is $149 per deal. Live checkout is available on the pricing page.",
  ],
  [
    "This is not a finished product. Payment is not collected on this site.",
    "OccupancyNPV is a working product. Live checkout is available on the pricing page.",
  ],
  [
    "It is not a finished product.",
    "It is a working OccupancyNPV product, not a CRM or lease-administration suite.",
  ],
  [
    "This is an early validation / pilot concept, not a finished product.",
    "OccupancyNPV is a live lease comparison and NPV workspace.",
  ],
  [
    "early validation / pilot concept",
    "live lease comparison product",
  ],
  [
    "validation / pilot concept",
    "lease comparison product",
  ],
  [
    "The live workflow is a pilot concept.",
    "OccupancyNPV compares occupancy-cost cash. It does not replace reading the lease.",
  ],
  [
    "The workflow is a validation pilot, not a finished product.",
    "OccupancyNPV is a live occupancy-cost comparison, not a substitute for counsel.",
  ],
  [
    "This site is a pilot workflow, not a finished product.",
    "OccupancyNPV is the live comparison workspace for those steps.",
  ],
  [
    "not a finished product, payment is not collected, not legal advice.",
    "working OccupancyNPV product, live checkout on the pricing page, not legal advice.",
  ],
  [
    "Trust or disclosure: not a finished product, payment is not collected, not legal advice.",
    "Trust or disclosure: working OccupancyNPV product, live checkout on the pricing page, not legal advice.",
  ],
  [
    "who wants a finished product with checkout today.",
    "who wants a CRM or lease-administration suite.",
  ],
  [
    "expects a finished product or believes",
    "expects a CRM or lease-administration suite or believes",
  ],
  [
    "anyone expecting a finished product with payment collected on this site.",
    "anyone expecting a CRM or lease-administration suite.",
  ],
  [
    "Pilot / early access — in validation, not generally available",
    "OccupancyNPV lease comparison workspace",
  ],
  [
    "In validation. Not generally available. No payment is collected.",
    "The product is live. Public rollout remains controlled. Checkout is available on the pricing page.",
  ],
  [
    "Pilot / early access. In validation. Not generally available. No payment is collected.",
    "The product is live. Public rollout remains controlled. Checkout is available on the pricing page.",
  ],
  [
    "the product is not generally available",
    "public rollout remains controlled",
  ],
  [
    "and is not generally available",
    " and public rollout remains controlled",
  ],
  [
    "It is not generally available.",
    "Public rollout remains controlled.",
  ],
  [
    "It is not generally available, and this site does not collect payment.",
    "Public rollout remains controlled. Checkout is available on the pricing page.",
  ],
  [
    "Not generally available",
    "Public rollout remains controlled",
  ],
  [
    "not generally available",
    "still in controlled public rollout",
  ],
  [
    "This site does not collect payment.",
    "Live checkout is available on the pricing page.",
  ],
  [
    "this site does not collect payment.",
    "live checkout is available on the pricing page.",
  ],
  [
    "does not collect payment.",
    "offers live checkout on the pricing page.",
  ],
  [
    "Payment is not collected on this site.",
    "Live checkout is available on the pricing page.",
  ],
  [
    "Payment is not collected here.",
    "Live checkout is available on the pricing page.",
  ],
  [
    "Payment is not collected and",
    "Live checkout is available on the pricing page and",
  ],
  [
    "No payment collected.",
    "Live checkout is available on the pricing page.",
  ],
  [
    "Payment is not collected.",
    "Live checkout is available for Professional and Per-Deal.",
  ],
  [
    "No payment is collected.",
    "Live checkout is available on the pricing page.",
  ],
  [
    "Checkout is not open.",
    "Checkout is available for Professional and Per-Deal.",
  ],
  [
    "or checkout on this page.",
    "or extra seats.",
  ],
  [
    "Interest only — not a purchase",
    "OccupancyNPV pricing",
  ],
  [
    "Early validation pricing hypotheses",
    "OccupancyNPV pricing",
  ],
  [
    "Early validation pricing hypotheses: $290 per year or $149 per deal. Interest only. Payment is not collected.",
    "OccupancyNPV pricing: $290 per year for Professional or $149 per deal. Live checkout is available.",
  ],
  [
    "What pricing is being tested for the pilot?",
    "What does OccupancyNPV cost?",
  ],
  [
    "Why pricing is being tested",
    "Why these offers exist",
  ],
  [
    "Pricing hypotheses",
    "Pricing",
  ],
  [
    "pricing hypotheses",
    "pricing",
  ],
  [
    "Review pricing hypotheses",
    "Review pricing",
  ],
  [
    "Request a validation pilot",
    "Request controlled / pilot access",
  ],
  [
    "validation-stage",
    "controlled-access",
  ],
  [
    "proposed early-access / pilot concept",
    "live OccupancyNPV product",
  ],
  [
    "How does the proposed workflow capture lease terms?",
    "How does OccupancyNPV capture lease terms?",
  ],
  [
    "The proposed workflow captures",
    "OccupancyNPV captures",
  ],
  [
    "the proposed workflow",
    "the OccupancyNPV workflow",
  ],
  [
    "The proposed workflow",
    "The OccupancyNPV workflow",
  ],
  [
    "proposed workflow",
    "OccupancyNPV workflow",
  ],
  [
    "Proposed workflow sequence",
    "OccupancyNPV workflow sequence",
  ],
  [
    "Proposed workflow",
    "OccupancyNPV workflow",
  ],
  [
    "See the proposed workflow",
    "See how OccupancyNPV works",
  ],
  [
    "See how the proposed workflow works",
    "See how OccupancyNPV works",
  ],
  [
    "How the proposed workflow works",
    "How OccupancyNPV works",
  ],
  [
    "What the proposed product does",
    "What OccupancyNPV does",
  ],
  [
    "The proposed product keeps",
    "OccupancyNPV keeps",
  ],
  [
    "The proposed product visualization",
    "The OccupancyNPV visualization",
  ],
  [
    "the proposed product",
    "OccupancyNPV",
  ],
  [
    "proposed product visualization",
    "OccupancyNPV visualization",
  ],
  [
    "proposed product",
    "OccupancyNPV",
  ],
  [
    "Proposed after",
    "After",
  ],
  [
    "Proposed lease comparison workspace",
    "OccupancyNPV lease comparison workspace",
  ],
  [
    "Proposed lease comparison",
    "Lease comparison",
  ],
  [
    "proposed interface",
    "comparison workspace",
  ],
  [
    "proposed mechanism",
    "OccupancyNPV workflow",
  ],
  [
    "A focused early-validation workflow",
    "A focused OccupancyNPV workflow",
  ],
  [
    "early-validation concept, not a finished product",
    "live OccupancyNPV product",
  ],
  [
    "early-validation disclosure stays next to the offer because public rollout remains controlled",
    "product disclosure stays next to the offer because public rollout remains controlled",
  ],
  [
    "The early-validation disclosure stays next to the offer because public rollout remains controlled.",
    "The product disclosure stays next to the offer because public rollout remains controlled.",
  ],
  [
    "need a shareable occupancy-cost comparison",
    "need an occupancy-cost comparison they can review with a client",
  ],
  [
    "shareable occupancy-cost comparison",
    "occupancy-cost comparison they can review with a client",
  ],
  [
    "shareable client summary",
    "in-workspace client summary",
  ],
  [
    "shareable summary",
    "in-workspace client summary",
  ],
  [
    "shareable view of the comparison",
    "in-workspace client summary",
  ],
  [
    "shareable ranking",
    "side-by-side ranking",
  ],
  [
    "a shareable comparison",
    "a client-facing comparison",
  ],
  [
    "Questions about this lease comparison pilot",
    "Questions about OccupancyNPV",
  ],
  [
    "Read pilot questions",
    "Read OccupancyNPV questions",
  ],
  [
    "Pilot questions",
    "OccupancyNPV questions",
  ],
  [
    "public validation site",
    "OccupancyNPV site",
  ],
  [
    "this public validation site",
    "OccupancyNPV",
  ],
  [
    "early-access commercial lease comparison validation site",
    "OccupancyNPV lease comparison product",
  ],
  [
    "waitlist-only",
    "controlled-access",
  ],
  [
    "hypothetical product",
    "OccupancyNPV product",
  ],
  [
    "future product",
    "OccupancyNPV product",
  ],
  [
    "coming later",
    "available now through OccupancyNPV",
  ],
  [
    "Is this a finished product?",
    "Does OccupancyNPV exist as a working product?",
  ],
  [
    "Is payment collected on this site?",
    "Can I purchase OccupancyNPV?",
  ],
  [
    "Is payment collected here?",
    "Can I purchase OccupancyNPV?",
  ],
  [
    "No. Pricing hypotheses are $290 per year or $149 per deal. A selection indicates interest only.",
    "Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on the pricing page.",
  ],
  [
    "request a validation pilot only after the numbers are explicit.",
    "open OccupancyNPV or review pricing after the numbers are explicit.",
  ],
  [
    "Proposed workflow visualization, not a production screenshot.",
    "Illustrative workflow visualization, not a live customer workspace.",
  ],
  [
    "proposed workflow visualization, not a production screenshot.",
    "illustrative workflow visualization, not a live customer workspace.",
  ],
  [
    "Two hypotheses are being tested: $290 per year for professional access, or $149 per deal comparison report.",
    "OccupancyNPV offers two ways to access the lease comparison workflow: Professional at $290 per year or Per-Deal at $149.",
  ],
  [
    "Two hypotheses are being tested",
    "OccupancyNPV offers two access options",
  ],
  [
    "These prices are being tested because",
    "These offers exist because",
  ],
  [
    "these prices are being tested",
    "these offers are available",
  ],
  [
    "The hypothesis is that",
    "OccupancyNPV is built so that",
  ],
  [
    "the hypothesis is that",
    "OccupancyNPV is built so that",
  ],
  [
    "The hypothesis includes access to the proposed cash-flow compare, NPV + sensitivity, and an in-workspace client summary while the Professional entitlement remains ACTIVE.",
    "Professional includes access to OccupancyNPV's lease comparison, NPV, sensitivity, and persistent workspace workflow while the Professional entitlement remains ACTIVE.",
  ],
  [
    "The hypothesis includes access to the proposed cash-flow compare",
    "Professional includes access to OccupancyNPV's lease comparison",
  ],
  [
    "the hypothesis includes access",
    "Professional includes access",
  ],
  [
    "proposed cash-flow compare",
    "OccupancyNPV cash-flow compare",
  ],
  [
    "Why pricing is being tested",
    "Why these offers exist",
  ],
  [
    "pricing is being tested",
    "these offers exist",
  ],
  [
    "prices are being tested",
    "offers are available",
  ],
  [
    "The hypothesis includes one comparison report if the product is built.",
    "Per-Deal includes one DealWorkspace.",
  ],
  [
    "The hypothesis includes one comparison report for OccupancyNPV access.",
    "Per-Deal includes one DealWorkspace.",
  ],
  [
    "The hypothesis includes one comparison report",
    "Per-Deal includes one DealWorkspace",
  ],
  [
    "Pricing hypothesis — selecting this indicates interest. Payment is not collected.",
    "Professional is $290 per year. Per-Deal is $149 per deal. Checkout is available on this page.",
  ],
  [
    "Pricing hypothesis",
    "Pricing",
  ],
  [
    "pricing hypothesis",
    "pricing",
  ],
  [
    "Pilot pricing is a hypothesis page, not a checkout.",
    "Current OccupancyNPV prices are on the pricing page.",
  ],
  [
    "Pilot <a href=\"/pricing\">pricing</a> is a hypothesis page, not a checkout.",
    "Current OccupancyNPV <a href=\"/pricing\">pricing</a> is available for checkout.",
  ],
  [
    "Pilot pricing is a hypothesis.",
    "Current OccupancyNPV prices are on the pricing page.",
  ],
  [
    "Compare commercial lease economics — early validation",
    "Compare commercial lease economics",
  ],
  [
    "A focused early-validation workflow",
    "A focused OccupancyNPV workflow",
  ],
  [
    "early-validation workflow",
    "OccupancyNPV workflow",
  ],
  [
    "early validation pricing",
    "OccupancyNPV pricing",
  ],
  [
    "It does not include a CRM, lease administration, or a finished product today.",
    "It does not include a CRM or lease-administration suite.",
  ],
  [
    "or a finished product today.",
    "or a lease-administration suite.",
  ],
  [
    "No. Pricing are $290 per year or $149 per deal. A selection indicates interest only.",
    "Yes. Professional is $290 per year and Per-Deal is $149 per deal. Checkout is available on this page.",
  ],
  [
    "A selection indicates interest only.",
    "Checkout is available on the pricing page.",
  ],
  [
    "Interest only. Live checkout is available for Professional and Per-Deal.",
    "Live checkout is available for Professional and Per-Deal.",
  ],
  [
    "Interest only. Live checkout is available",
    "Live checkout is available",
  ],
];

const HOW_IT_WORKS_CURRENT_WORKFLOW = `
            <h2>How OccupancyNPV works today</h2>
            <ol>
              <li>Create an account and sign in.</li>
              <li>Choose Professional or Per-Deal through OccupancyNPV checkout, or use an existing paid entitlement.</li>
              <li>Create a DealWorkspace.</li>
              <li>Enter competing lease scenarios.</li>
              <li>Configure economic terms such as rent steps, free rent, and occupancy-cost inputs.</li>
              <li>Run the comparison and NPV.</li>
              <li>Review results and discount-rate sensitivity in the workspace.</li>
            </ol>
`;

function shouldRepairPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("app/api/")) return false;
  if (normalized.startsWith("app/occupancynpv/")) return false;
  if (normalized.startsWith("lib/occupancynpv/")) return false;
  if (normalized === "package.json" || normalized.endsWith(".css")) return false;
  if (normalized.endsWith(".json") && !normalized.includes("authority-site-provenance") && !normalized.includes("site-schema")) return false;
  if (normalized.includes("venture-footer")) return false;
  return (
    normalized.endsWith("page.tsx")
    || normalized.endsWith("layout.tsx")
    || normalized.includes("components/")
    || normalized.includes("lib/site-schema")
    || normalized.includes("validation-grade")
    || normalized.includes("premium-venture")
    || normalized.includes("authority-site-provenance")
  );
}

export function applyOccupancynpvLaunchMessagingRepair(content: string): string {
  let next = content;
  for (const [from, to] of STRING_REPLACEMENTS) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  next = next.replace(/\bnot a finished product\b/gi, "a working OccupancyNPV product");
  next = next.replace(/\bnot generally available\b/gi, "still in controlled public rollout");
  next = next.replace(/\bvalidation-stage\b/gi, "controlled-access");
  next = next.replace(/Two hypotheses are being tested:?[^.]*\./gi, "OccupancyNPV offers two ways to access the lease comparison workflow: Professional at $$290 per year or Per-Deal at $$149.");
  next = next.replace(/These prices are being tested because/gi, "These offers exist because");
  next = next.replace(/The hypothesis includes[^.]*\./gi, "Professional includes access to OccupancyNPV's lease comparison, NPV, sensitivity, and persistent workspace workflow.");
  next = next.replace(/\bthe hypothesis is\b/gi, "the current offer is");
  next = next.replace(/\bThe hypothesis is\b/g, "The current offer is");
  next = next.replace(/\bPricing hypothesis\b/g, "Pricing");
  next = next.replace(/\bpricing hypothesis\b/gi, "pricing");
  next = next.replace(/Pilot([\s\S]{0,80})is a hypothesis page[^.]*\./gi, "Current OccupancyNPV$1is available for checkout.");
  next = next.replace(/Compare commercial lease economics — early validation/gi, "Compare commercial lease economics");
  return next;
}

function patchHowItWorks(content: string): string {
  if (content.includes("How OccupancyNPV works today")) return content;
  if (content.includes("<h2>The problem the current method creates</h2>")) {
    return content.replace(
      "<h2>The problem the current method creates</h2>",
      `${HOW_IT_WORKS_CURRENT_WORKFLOW}
            <h2>The problem the current method creates</h2>`,
    );
  }
  return content;
}

function patchEarlyAccess(content: string): string {
  let next = content;
  if (next.includes("<h1>Request pilot access</h1>") && !next.includes("OccupancyNPV is a live")) {
    next = next.replace(
      "<h1>Request pilot access</h1>",
      "<h1>Request pilot access</h1>\n        <p>OccupancyNPV is a live lease comparison and NPV product. This page is for controlled or pilot participation while public rollout remains controlled. Checkout is available on the pricing page.</p>",
    );
  }
  return next;
}

export function applyOccupancynpvLaunchMessagingRepairToFiles<T extends { path: string; content: string }>(
  files: T[],
): T[] {
  return files.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (!shouldRepairPath(path)) return file;
    let content = applyOccupancynpvLaunchMessagingRepair(file.content);
    if (path === "app/how-it-works/page.tsx") content = patchHowItWorks(content);
    if (path === "app/early-access/page.tsx") content = patchEarlyAccess(content);
    return content === file.content ? file : { ...file, content };
  });
}

export function applyLifecycleAwarePublicMessaging<T extends { path: string; content: string }>(
  files: T[],
  lifecycle: { productBuilt: boolean; paymentActive: boolean; fulfillmentReady: boolean },
): T[] {
  if (lifecycle.productBuilt && (lifecycle.paymentActive || lifecycle.fulfillmentReady)) {
    return applyOccupancynpvLaunchMessagingRepairToFiles(files);
  }
  return files;
}
