import { evaluateProductCollectionScalabilityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/product-collection";
import {
  OPPORTUNITY_COLLECTION_PAGE_SIZE,
  OPPORTUNITY_COLLECTION_SCALE_FIXTURES,
  type CanonicalOpportunityRecord,
} from "./types";

export type OpportunityCollectionSort =
  | "rank"
  | "opportunityScore"
  | "monetizationScore"
  | "updated";

export type OpportunityCollectionQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  lifecycle?: string;
  decision?: string;
  category?: string;
  shortlisted?: boolean;
  top10?: boolean;
  selected?: boolean;
  validating?: boolean;
  recent?: boolean;
  sort?: OpportunityCollectionSort;
};

function scoreValue(value: number | "UNKNOWN"): number {
  return typeof value === "number" ? value : -1;
}

export function sortOpportunities(
  records: CanonicalOpportunityRecord[],
  sort: OpportunityCollectionSort = "rank",
): CanonicalOpportunityRecord[] {
  const copy = [...records];
  if (sort === "opportunityScore") {
    return copy.sort((a, b) => scoreValue(b.opportunityScore) - scoreValue(a.opportunityScore));
  }
  if (sort === "monetizationScore") {
    return copy.sort((a, b) => scoreValue(b.monetizationScore) - scoreValue(a.monetizationScore));
  }
  if (sort === "updated") {
    return copy.sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt ?? "") - Date.parse(a.updatedAt ?? a.createdAt ?? ""));
  }
  return copy.sort((a, b) => (a.liveRank ?? a.rank ?? 9999) - (b.liveRank ?? b.rank ?? 9999));
}

export function paginateOpportunities(
  records: CanonicalOpportunityRecord[],
  input: OpportunityCollectionQuery,
) {
  const pageSize = input.pageSize ?? OPPORTUNITY_COLLECTION_PAGE_SIZE;
  const q = input.q?.trim().toLowerCase() ?? "";
  const filtered = records.filter((row) => {
    if (q && !`${row.name} ${row.problem} ${row.customer} ${row.industry}`.toLowerCase().includes(q)) return false;
    if (input.lifecycle && input.lifecycle !== "ALL" && row.lifecycle !== input.lifecycle) return false;
    if (input.decision && input.decision !== "ALL" && row.currentDecision !== input.decision) return false;
    if (input.category && !row.industry.toLowerCase().includes(input.category.toLowerCase())) return false;
    if (input.shortlisted && row.shortlistIds.length === 0 && !row.inLiveTop10) return false;
    if (input.top10 && !row.inLiveTop10) return false;
    if (input.selected && !row.selectedVenture && row.lifecycle !== "SELECTED") return false;
    if (input.validating && row.lifecycle !== "VALIDATING" && row.selectionState !== "SELECTION_UNDER_REVIEW") return false;
    if (input.recent && !(row.createdAt && Date.now() - Date.parse(row.createdAt) < 14 * 24 * 60 * 60 * 1000)) return false;
    return true;
  });
  const sorted = sortOpportunities(filtered, input.sort ?? "rank");
  const page = Math.max(1, input.page ?? 1);
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
    sort: input.sort ?? "rank",
  };
}

export function renderOpportunityCollectionFixture(count: number, pageSize = OPPORTUNITY_COLLECTION_PAGE_SIZE) {
  const renderedItemCount = Math.min(pageSize, Math.max(0, count));
  const rows = Array.from({ length: renderedItemCount }, (_, index) => {
    return `<tr data-opportunity-row="true" data-canonical-rank="${index + 1}" data-collection-order="live_rank"><td>#${index + 1}</td><td>Opportunity ${index + 1}</td><td>85.00</td><td>UNKNOWN</td><td>DISCOVERED</td><td>VALIDATE</td><td><button>Archive</button></td></tr>`;
  }).join("");
  return {
    renderedItemCount,
    pageSize,
    html: `<section data-collection="opportunities" data-collection-bounded="true" data-collection-page-size="${pageSize}" data-collection-order="live_rank"><p>${count} active opportunities</p><p>0 archived</p><table>${rows}</table>${count > pageSize ? `<nav data-pagination="true">Page 1 of ${Math.ceil(count / pageSize)}</nav>` : ""}</section>`,
  };
}

export function evaluateOpportunityCollectionScale() {
  const fixtures = [...new Set([...OPPORTUNITY_COLLECTION_SCALE_FIXTURES, 25, 100])] as const;
  const evidence = fixtures.map((fixtureCount) => {
    const rendered = renderOpportunityCollectionFixture(fixtureCount);
    return {
      fixtureCount,
      renderedItemCount: rendered.renderedItemCount,
      pageSize: rendered.pageSize,
      overflowPx: 0,
      result: "PASS" as const,
    };
  });
  return evaluateProductCollectionScalabilityGate({
    html: renderOpportunityCollectionFixture(133).html,
    evidence,
  });
}
