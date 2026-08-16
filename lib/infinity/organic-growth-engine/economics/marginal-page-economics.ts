import type { MarginalPageEconomics, PageOpportunity, VentureOrganicContext } from "../types";

export function calculateMarginalPageEconomics(
  opportunity: PageOpportunity,
  context: VentureOrganicContext,
  economics?: { grossMarginPercent?: number; averageOrderValue?: number; customerLifetimeValue?: number; conversionRateEstimate?: number },
): MarginalPageEconomics {
  const valuePerConversion =
    economics?.averageOrderValue ??
    context.averageOrderValue ??
    (economics?.customerLifetimeValue ?? context.customerLifetimeValue ?? 500) * 0.2;
  const expectedTraffic = opportunity.estimatedTrafficPotential;
  const expectedConversionRate =
    economics?.conversionRateEstimate ?? context.conversionRateEstimate ?? opportunity.estimatedConversionPotential;
  const productionCost = opportunity.estimatedProductionCost;
  const researchCost = opportunity.estimatedResearchCost;
  const maintenanceCost = opportunity.estimatedMaintenanceCost;
  const expectedRevenue = expectedTraffic * expectedConversionRate * valuePerConversion;
  const grossMargin = (economics?.grossMarginPercent ?? 65) / 100;
  const expectedGrossProfit = expectedRevenue * grossMargin - maintenanceCost;
  const totalCost = productionCost + researchCost;
  const expectedPaybackPeriod =
    expectedGrossProfit > 0 ? Math.ceil(totalCost / (expectedGrossProfit / 12)) : Infinity;
  const authorityContribution = opportunity.authorityRelationship.includes("hub") ? 0.8 : 0.35;
  const citationContribution = opportunity.citationPotential;
  const expectedPageValue = expectedGrossProfit + authorityContribution * 200 + citationContribution * 100;
  const marginalExpansionValue = expectedPageValue - totalCost;

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    productionCost,
    researchCost,
    maintenanceCost,
    expectedTraffic,
    expectedConversionRate,
    valuePerConversion,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    expectedGrossProfit: Math.round(expectedGrossProfit * 100) / 100,
    expectedPaybackPeriod: Number.isFinite(expectedPaybackPeriod) ? expectedPaybackPeriod : 999,
    authorityContribution,
    citationContribution,
    expectedPageValue: Math.round(expectedPageValue * 100) / 100,
    marginalExpansionValue: Math.round(marginalExpansionValue * 100) / 100,
  };
}

export function calculateClusterEconomics(
  economics: MarginalPageEconomics[],
): { expectedClusterValue: number; marginalExpansionValue: number } {
  const expectedClusterValue = economics.reduce((sum, e) => sum + e.expectedPageValue, 0);
  const marginalExpansionValue = economics.reduce((sum, e) => sum + e.marginalExpansionValue, 0);
  return {
    expectedClusterValue: Math.round(expectedClusterValue * 100) / 100,
    marginalExpansionValue: Math.round(marginalExpansionValue * 100) / 100,
  };
}

export function filterByMarginalEconomics(
  opportunities: PageOpportunity[],
  economics: MarginalPageEconomics[],
  minMarginalValue = 0,
): PageOpportunity[] {
  const econMap = new Map(economics.map((e) => [e.pageOpportunityId, e]));
  return opportunities.filter((o) => {
    const econ = econMap.get(o.pageOpportunityId);
    if (!o) return false;
    if (o.pageType === "homepage") return true;
    return (econ?.marginalExpansionValue ?? -1) >= minMarginalValue;
  });
}
