import type { PlannedPage, SchemaType } from "./types";

export function buildPageSchema(page: PlannedPage, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebPage",
      "@id": `${page.canonical}#webpage`,
      name: page.title,
      url: page.canonical,
      description: page.metaDescription,
      isPartOf: { "@id": "/#website" },
    },
  ];
  if (page.schemaTypes.includes("BreadcrumbList") && page.parentHub) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: page.parentHub === "/resources" ? "Resources" : "Home", item: page.parentHub },
        { "@type": "ListItem", position: 3, name: page.title, item: page.canonical },
      ],
    });
  } else if (page.schemaTypes.includes("BreadcrumbList")) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        ...(page.route === "/" ? [] : [{ "@type": "ListItem", position: 2, name: page.title, item: page.canonical }]),
      ],
    });
  }
  if (page.role === "HOMEPAGE") {
    graph.push({
      "@type": "WebSite",
      "@id": "/#website",
      name: "Commercial lease NPV comparison",
      url: "/",
      publisher: { "@id": "/#operator" },
    });
    graph.push({
      "@type": "Organization",
      "@id": "/#operator",
      name: "An Infinite OS Venture",
      url: "https://imros.io",
      description: "Operator attribution. No reviews, ratings, employee counts, or awards are claimed.",
    });
  }
  if (page.schemaTypes.includes("Article")) {
    graph.push({
      "@type": "Article",
      headline: page.title,
      description: page.metaDescription,
      mainEntityOfPage: `${page.canonical}#webpage`,
    });
  }
  if (page.schemaTypes.includes("CollectionPage")) {
    graph.push({
      "@type": "CollectionPage",
      name: page.title,
      hasPart: [
        { "@id": "/commercial-lease-npv#webpage" },
        { "@id": "/compare-commercial-leases#webpage" },
        { "@id": "/tenant-improvement-allowance#webpage" },
        { "@id": "/discount-rate-sensitivity#webpage" },
      ],
    });
    graph.push({
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Commercial lease NPV", url: "/commercial-lease-npv" },
        { "@type": "ListItem", position: 2, name: "Compare commercial leases", url: "/compare-commercial-leases" },
        { "@type": "ListItem", position: 3, name: "Tenant improvement allowance", url: "/tenant-improvement-allowance" },
        { "@type": "ListItem", position: 4, name: "Discount-rate sensitivity", url: "/discount-rate-sensitivity" },
      ],
    });
  }
  if (page.schemaTypes.includes("HowTo")) {
    graph.push({
      "@type": "HowTo",
      name: "Compare commercial lease options in the proposed workflow",
      step: [
        { "@type": "HowToStep", position: 1, name: "Capture terms", text: "Enter rent, term, escalations, TI, free rent, and CAM for each option." },
        { "@type": "HowToStep", position: 2, name: "Normalize cash flows", text: "Place each cost and incentive on a shared timeline." },
        { "@type": "HowToStep", position: 3, name: "Discount to NPV", text: "Convert the stream to present value at an explicit discount rate." },
        { "@type": "HowToStep", position: 4, name: "Share the comparison", text: "Review sensitivity and a client-facing summary. Illustrative only." },
      ],
    });
  }
  if (page.schemaTypes.includes("FAQPage") && extra.faq) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: extra.faq,
    });
  }
  const forbidden = new Set<SchemaType>(["SoftwareApplication", "Product", "Offer"]);
  const used = graph.flatMap((item) => (Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]]));
  if (used.some((type) => forbidden.has(String(type) as SchemaType))) {
    throw new Error("forbidden_schema_type");
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
