import { occupancyNpvAffiliateProgram } from "@/lib/infinity/affiliate-referral/occupancy";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { occupancyNpvSalesEvidence, observeSalesFloorForLoop } from "@/lib/infinity/venture-sales-floor";
import { OCCUPANCYNPV_CLOUD_CAMPAIGN_ID } from "./contract";
import type { CloudRuntimeObservation } from "./types";

export function observeCloudRuntimePortfolio(): CloudRuntimeObservation {
  const affiliate = occupancyNpvAffiliateProgram();
  const sales = observeSalesFloorForLoop(occupancyNpvSalesEvidence());
  return {
    occupancy_loaded: true,
    campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
    campaign_recognized: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID === OCCUPANCYNPV_CLOUD_CAMPAIGN_ID,
    duplicate_campaign: false,
    sales_floor_available: sales.floor_present,
    affiliate_available: affiliate.capability_provisioned,
    affiliate_program_state: affiliate.state,
    payout_live: false,
    outreach_sent: false,
    affiliate_outreach_sent: false,
  };
}

export function occupancyNpvCampaignMustNotDuplicate(existingId: string | null): boolean {
  return existingId === OCCUPANCYNPV_CLOUD_CAMPAIGN_ID || existingId === OCCUPANCYNPV_GROWTH_CAMPAIGN_ID;
}
