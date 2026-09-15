import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/growth-engine/venture-identity";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID } from "./contract";
import type { SalesFloorEvidence } from "./types";

export const COMMERCIAL_VENTURE_IDS = [CRE_VENTURE_ID, ASKREVIEW_VENTURE_ID] as const;

export function isCommercialVenture(input: { venture_id: string; commercial?: boolean; explicitly_non_commercial?: boolean }): boolean {
  if (input.explicitly_non_commercial) return false;
  if (input.commercial === false) return false;
  return COMMERCIAL_VENTURE_IDS.includes(input.venture_id as (typeof COMMERCIAL_VENTURE_IDS)[number]) || input.commercial === true;
}

export function occupancyNpvSalesEvidence(input?: Partial<SalesFloorEvidence> & {
  campaign_status?: string;
  authorized_to_execute?: boolean;
  sending?: boolean;
}): SalesFloorEvidence {
  const campaignId = input?.existing_campaign?.campaign_id ?? OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID;
  return {
    venture_id: CRE_VENTURE_ID,
    display_name: "OccupancyNPV",
    commercial: true,
    customers: input?.customers ?? 0,
    inbound_signals: input?.inbound_signals ?? [],
    qualified_opportunities: input?.qualified_opportunities ?? 0,
    won_deals: input?.won_deals ?? 0,
    lost_deals: input?.lost_deals ?? 0,
    partners: input?.partners ?? [],
    offer_ready: input?.offer_ready ?? true,
    public_site_live: input?.public_site_live ?? true,
    existing_campaign: {
      campaign_id: campaignId,
      motion: "OUTBOUND_PROSPECTING",
      recognized: true,
      sending: input?.sending ?? false,
      authorized_to_execute: input?.authorized_to_execute ?? false,
    },
    suppressions: input?.suppressions ?? [],
    objections: input?.objections ?? [],
    observations: input?.observations ?? [],
    provider_failures: input?.provider_failures ?? 0,
    pipeline: input?.pipeline ?? [],
    paid_acquisition: 0,
    money_movement: "DISABLED",
    mercury: "READ_ONLY",
  };
}

export function askReviewSalesEvidence(): SalesFloorEvidence {
  return {
    venture_id: ASKREVIEW_VENTURE_ID,
    display_name: "AskReview",
    commercial: true,
    customers: 0,
    inbound_signals: [],
    qualified_opportunities: 0,
    won_deals: 0,
    lost_deals: 0,
    partners: [],
    offer_ready: false,
    public_site_live: false,
    suppressions: [],
    objections: [],
    observations: [],
    provider_failures: 0,
    pipeline: [],
    paid_acquisition: 0,
    money_movement: "DISABLED",
    mercury: "READ_ONLY",
  };
}

export function recognizesOccupancyOutboundCampaign(campaignId: string): boolean {
  return campaignId === OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID;
}
