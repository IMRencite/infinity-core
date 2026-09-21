import { evaluatePublicLaunchReadinessGate, persistOccupancynpvPublicLaunchReadiness } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch-readiness";
import { evaluateOccupancynpvLaunchMessaging } from "../lib/infinity/venture-operating-scale/public-launch-messaging-consistency-gate";
import { evaluateOccupancynpvOfferConsistency } from "../lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { projectOccupancynpvHqDetail } from "../lib/infinity/venture-operating-scale/hq-venture-registry";
import { evaluateHumanFirstPublicLanguageGate } from "../lib/infinity/venture-website-architecture/human-first-public-language-gate";
import { readOccupancynpvLaunchMessagingEvidence } from "../lib/infinity/venture-operating-scale/public-launch-messaging-consistency-gate";

const messaging = evaluateOccupancynpvLaunchMessaging();
const consistency = evaluateOccupancynpvOfferConsistency();
const gate = persistOccupancynpvPublicLaunchReadiness();
const hq = projectOccupancynpvHqDetail();
const evidence = readOccupancynpvLaunchMessagingEvidence();
const human = (evidence?.pages ?? []).map((page) => ({
  route: page.route,
  result: evaluateHumanFirstPublicLanguageGate(page.html).overall,
}));

console.log(JSON.stringify({
  messaging: {
    result: messaging.result,
    notBuilt: messaging.notBuiltClaims,
    noPayment: messaging.noPaymentClaims ?? [],
    contradictions: messaging.launchBlockingContradictions,
    missingRevalidation: "missingRevalidationEvidence" in messaging ? messaging.missingRevalidationEvidence : null,
  },
  consistency: consistency.result,
  human,
  hqBlockers: hq?.commercial.blockers,
  pending: hq?.governance.pendingFounderAction,
  launch: {
    result: gate.result,
    failed: gate.failed,
    categories: gate.categories,
    nextState: gate.nextState,
    pending: gate.pendingFounderAction,
  },
}, null, 2));
