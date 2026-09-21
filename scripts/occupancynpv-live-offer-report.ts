import { evaluateOccupancyNpvLiveOfferOptions, selectOccupancyNpvLiveCustomerFacingOffer, activateOccupancyNpvLivePaidFirstOffer } from "../lib/infinity/offer-architecture/occupancynpv-live-activation";
import { analyzeOccupancyNpvOffers } from "../lib/infinity/offer-architecture/occupancynpv";
import { projectVentureOfferArchitectureHq } from "../lib/infinity/offer-architecture/hq";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { buildOccupancynpvCurrentEvidence } from "../lib/infinity/universal-venture-system-qc/current-evidence";
import { evaluateOccupancynpvFullSystemQc } from "../lib/infinity/universal-venture-system-qc/occupancynpv";
import { projectVentureSystemQcHqSummary } from "../lib/infinity/universal-venture-system-qc/hq";
import { readCanonicalProductionOperatingState } from "../lib/infinity/growth-engine/hq-runtime-projection";
import { OCCUPANCYNPV_PER_DEAL_PRICE_USD, OCCUPANCYNPV_PROFESSIONAL_PRICE_USD } from "../lib/infinity/growth-engine/occupancynpv-experiment";

const options = evaluateOccupancyNpvLiveOfferOptions();
const selected = selectOccupancyNpvLiveCustomerFacingOffer();
const activated = activateOccupancyNpvLivePaidFirstOffer();
const hq = projectVentureOfferArchitectureHq(CRE_VENTURE_ID);
const evidence = buildOccupancynpvCurrentEvidence();
const full = evaluateOccupancynpvFullSystemQc(evidence);
const qcHq = projectVentureSystemQcHqSummary(CRE_VENTURE_ID);
const growth = readCanonicalProductionOperatingState();
console.log(JSON.stringify({
  options: Object.fromEntries(options.map((row) => [row.id, { decision: row.decision, friction: row.purchase_friction, ttv: row.time_to_value_fit, abuse: row.abuse_risk }])),
  selected: selected.selected_offer,
  decision: selected.decision,
  confidence: selected.confidence,
  reason: selected.reason,
  analysis_decision: analyzeOccupancyNpvOffers().decision,
  prices: { professional: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD, perDeal: OCCUPANCYNPV_PER_DEAL_PRICE_USD },
  experiment: {
    contract: activated.experiment.contract,
    status: activated.experiment.status,
    primary: activated.experiment.primary_metric,
    secondary: activated.experiment.secondary_metrics,
  },
  hq,
  commercial: evidence.commercial_offer.status,
  systems: {
    pricing: full.systems.pricing,
    commercial_offer: full.systems.commercial_offer,
    checkout: full.systems.checkout,
    payment: full.systems.payment,
    fulfillment: full.systems.fulfillment,
    growth: full.systems.growth,
    gmail: full.systems.gmail,
    gemini: full.systems.gemini,
    durable_queue: full.systems.durable_queue,
    reply_handling: full.systems.reply_handling,
  },
  overall: full.overall,
  quality: full.quality.result,
  qcHq: {
    commercial_offer: qcHq.commercial_offer,
    rendered_offer: qcHq.rendered_offer,
    offer_disclosure: qcHq.offer_disclosure,
    offer_journey: qcHq.offer_journey,
    offer_measurement: qcHq.offer_measurement,
  },
  growthCap: growth?.campaign,
  dailyCap: growth,
}, null, 2));
