import { OpportunityCenter } from "@/components/dashboard/opportunity-center";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorOrgContext } from "@/lib/infinity/operator-console/require-org-context";
import { loadCanonicalOpportunityUniverse } from "@/lib/infinity/opportunity-universe-hq/load";
import { paginateOpportunities, realCanonicalOpportunities } from "@/lib/infinity/opportunity-universe-hq";
import type { OpportunityCollectionSort } from "@/lib/infinity/opportunity-universe-hq/collection";

type Props = {
  searchParams?: Promise<{
    view?: string;
    q?: string;
    lifecycle?: string;
    decision?: string;
    category?: string;
    sort?: string;
    page?: string;
    top10?: string;
    selected?: string;
    validating?: string;
  }>;
};

export default async function OpportunitiesPage({ searchParams }: Props) {
  const org = await requireOperatorOrgContext();
  const params = searchParams ? await searchParams : {};
  const view = params.view ?? "overview";
  const q = params.q ?? "";
  const lifecycle = params.lifecycle ?? "ALL";
  const decision = params.decision ?? "ALL";
  const category = params.category ?? "";
  const sort = (params.sort ?? "rank") as OpportunityCollectionSort;
  const pageNumber = Number(params.page ?? "1");
  const universe = await loadCanonicalOpportunityUniverse(createAdminClient(), org.organizationId);
  const real = realCanonicalOpportunities(universe.real);
  const page = paginateOpportunities(real, {
    page: pageNumber,
    q,
    lifecycle,
    decision,
    category,
    sort,
    top10: params.top10 === "1",
    selected: params.selected === "1",
    validating: params.validating === "1",
  });

  return (
    <OpportunityCenter
      counts={universe.counts}
      attention={universe.attention}
      top={universe.liveRanking.top10}
      page={page}
      currentShortlist={universe.currentShortlist}
      previousShortlist={universe.previousShortlist}
      diff={universe.shortlistDiff}
      snapshots={universe.rankingSnapshots}
      runs={universe.discoveryRuns}
      q={q}
      lifecycle={lifecycle}
      decision={decision}
      category={category}
      sort={sort}
      top10={params.top10 === "1"}
      selected={params.selected === "1"}
      validating={params.validating === "1"}
      view={view}
    />
  );
}
