import { GEO_SEO_CONTENT_ARCHITECTURE_V1 } from "./constants";
import type { ContentEvidence, PlannedPage } from "./types";

export function geoSeoContentArchitecture() {
  return {
    contract: GEO_SEO_CONTENT_ARCHITECTURE_V1,
    principles: [
      "direct-answer paragraphs",
      "clear entity definitions",
      "question-driven subsections",
      "semantic relationships",
      "explicit terminology",
      "authoritative citations",
      "fact-supported statements",
      "structured data",
      "concise quotable explanations",
      "deeper supporting detail",
    ],
    searchVolumePolicy: "UNKNOWN when exact volume is unavailable — never invent",
    providerNeutrality: "web.search capability, not a named HTML parser",
  };
}

export function answerFirstBlock(question: string, answer: string): { question: string; answer: string } {
  return { question, answer };
}

export function creAuthoritySources(observedAt: string): ContentEvidence[] {
  return [
    {
      claim: "Net present value discounts future cash flows to a present value using a discount rate.",
      source: "https://www.investopedia.com/terms/n/npv.asp",
      sourceType: "FINANCE_REFERENCE",
      observedAt,
      support: "Definitional finance reference for NPV, not a CRE competitor.",
      page: "/commercial-lease-npv",
      section: "direct-answer",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "HIGH",
    },
    {
      claim: "A discount rate is the rate used to convert future amounts into present value.",
      source: "https://www.investopedia.com/terms/d/discountrate.asp",
      sourceType: "FINANCE_REFERENCE",
      observedAt,
      support: "Definitional finance reference for discount rate.",
      page: "/discount-rate-sensitivity",
      section: "direct-answer",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "HIGH",
    },
    {
      claim: "Commercial real estate practice language is maintained by recognized industry organizations.",
      source: "https://www.naiop.org/",
      sourceType: "INDUSTRY",
      observedAt,
      support: "Industry organization context for commercial real estate terminology.",
      page: "/resources",
      section: "authority",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "MEDIUM",
    },
    {
      claim: "Building and occupancy-cost practice is discussed by recognized commercial building organizations.",
      source: "https://www.boma.org/",
      sourceType: "INDUSTRY",
      observedAt,
      support: "Industry organization context for building operating practices such as common-area costs.",
      page: "/tenant-improvement-allowance",
      section: "authority",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "MEDIUM",
    },
    {
      claim: "Real estate broker occupational context is published by the U.S. Bureau of Labor Statistics.",
      source: "https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm",
      sourceType: "GOVERNMENT",
      observedAt,
      support: "Public occupational description for brokers; not used as demand volume.",
      page: "/compare-commercial-leases",
      section: "authority",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "MEDIUM",
    },
    {
      claim: "Financial reporting standards organizations publish authoritative accounting literature.",
      source: "https://www.fasb.org/",
      sourceType: "ACCOUNTING",
      observedAt,
      support: "Accounting-standard organization used as an authority class, not a lease-product claim.",
      page: "/commercial-lease-npv",
      section: "authority",
      model: "deterministic_writer_v1",
      provider: "infinity-native",
      confidence: "MEDIUM",
    },
  ];
}

export function uniqueMetadata(pages: PlannedPage[]): { uniqueTitles: boolean; uniqueDescriptions: boolean } {
  const titles = pages.map((page) => page.title);
  const descriptions = pages.map((page) => page.metaDescription);
  return {
    uniqueTitles: new Set(titles).size === titles.length,
    uniqueDescriptions: new Set(descriptions).size === descriptions.length,
  };
}
