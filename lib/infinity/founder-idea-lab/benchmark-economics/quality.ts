import type { BenchmarkSourceClass } from "./types";

const HIGH_HOSTS = /\b(sec\.gov|investor\.|ir\.|gartner|forrester|keybanc|bessemer|profitwell|chartmogul|openview|pacificcrest|bloomberg|wsj|ft\.com)\b/i;
const MEDIUM_HOSTS = /\b(mckinsey|bain|pwc|deloitte|kpmg|statista|saastr|firstpage|hubspot|salesforce)\b/i;
const LOW_HOSTS = /\b(medium\.com|listicle|buzzfeed|ai-generated|seo-blog)\b/i;

export function classifyBenchmarkSource(url: string, claim: string): BenchmarkSourceClass {
  const blob = `${url} ${claim}`;
  if (/\b10-k\b|\b10-q\b|annual report|sec filing|public filings/i.test(blob) || /sec\.gov/i.test(url)) {
    return "PUBLIC_COMPANY_REPORTING";
  }
  if (/official|pricing page|company disclosure|investor/i.test(blob)) return "OFFICIAL_COMPANY_MATERIAL";
  if (HIGH_HOSTS.test(blob) || /benchmark study|industry report/i.test(claim)) return "CREDIBLE_BENCHMARK_STUDY";
  if (/gartner|forrester|keybanc|bessemer/i.test(blob)) return "RECOGNIZED_RESEARCH_FIRM";
  if (/financial disclosure|reported cac|disclos/i.test(claim)) return "FINANCIAL_DISCLOSURE";
  if (/methodology|survey of \d+/i.test(claim) || MEDIUM_HOSTS.test(blob)) return "AGENCY_WITH_METHODOLOGY";
  if (/university|journal|academic/i.test(blob)) return "ACADEMIC_OR_INDUSTRY_RESEARCH";
  if (LOW_HOSTS.test(blob) || /listicle|ai generated/i.test(blob)) return "AI_GENERATED_LISTICLE";
  if (/blog\b/i.test(blob) && !/methodology/i.test(claim)) return "ANONYMOUS_MARKETING_BLOG";
  if (!url || url === "UNKNOWN") return "UNKNOWN";
  return "UNSOURCED_SEO_PAGE";
}

export function sourceQualityHigh(sourceClass: BenchmarkSourceClass): boolean {
  return (
    sourceClass === "PUBLIC_COMPANY_REPORTING" ||
    sourceClass === "OFFICIAL_COMPANY_MATERIAL" ||
    sourceClass === "CREDIBLE_BENCHMARK_STUDY" ||
    sourceClass === "RECOGNIZED_RESEARCH_FIRM" ||
    sourceClass === "FINANCIAL_DISCLOSURE"
  );
}

export function sourceQualityScore(sourceClass: BenchmarkSourceClass): number {
  if (sourceQualityHigh(sourceClass)) return 1;
  if (sourceClass === "AGENCY_WITH_METHODOLOGY" || sourceClass === "ACADEMIC_OR_INDUSTRY_RESEARCH") return 0.7;
  if (sourceClass === "UNSOURCED_SEO_PAGE" || sourceClass === "ANONYMOUS_MARKETING_BLOG") return 0.25;
  if (sourceClass === "AI_GENERATED_LISTICLE") return 0.1;
  return 0.35;
}
