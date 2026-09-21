import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock";
import { LOCKED_CRE_EXPERIMENT_ID } from "../lib/infinity/market-validation-experiment/constants";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { projectVentureOperatingScaleHq } from "../lib/infinity/venture-operating-scale/hq";
import { projectOccupancynpvHqDetail } from "../lib/infinity/venture-operating-scale/hq-venture-registry";
import { evaluateOccupancynpvFulfillmentReadiness, occupancynpvCommercializationBlockers, occupancynpvClearedCommercializationBlockers } from "../lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { evaluatePublicLaunchReadinessGate } from "../lib/infinity/venture-operating-scale/occupancynpv-public-launch-readiness";
import { runDailyVentureOperatingCycle } from "../lib/infinity/venture-operating-scale/operations";
import { readVentureOperationalRecord } from "../lib/infinity/venture-operating-scale/persist";
import { readOccupancynpvDurableAuthority } from "../lib/infinity/venture-operating-scale/occupancynpv-durable-authority";

const gate = evaluatePublicLaunchReadinessGate();
const hq = projectVentureOperatingScaleHq();
const detail = projectOccupancynpvHqDetail();
const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
const record = readVentureOperationalRecord(CRE_VENTURE_ID);
const authority = readOccupancynpvDurableAuthority();
const evidence = readOccupancynpvPublicLaunchEvidence();

console.log(JSON.stringify({
  publiclyLaunched: occupancynpvPubliclyLaunched(),
  evidence,
  gate: {
    result: gate.result,
    publiclyLaunched: gate.publiclyLaunched,
    failed: gate.failed,
    nextState: gate.nextState,
    pendingFounderAction: gate.pendingFounderAction,
    categories: gate.categories,
  },
  fulfillment: evaluateOccupancynpvFulfillmentReadiness().result,
  blockers: occupancynpvCommercializationBlockers(),
  cleared: occupancynpvClearedCommercializationBlockers(),
  hq: {
    publicLaunch: hq.authorityVisibility.publicLaunch,
    launchedAt: hq.authorityVisibility.launchedAt,
    founderLaunchAuthorization: hq.authorityVisibility.founderLaunchAuthorization,
    remainingBlockers: hq.authorityVisibility.remainingBlockers,
    paymentActivation: hq.authorityVisibility.paymentActivation,
    fulfillment: hq.authorityVisibility.fulfillmentReadiness,
    orphaned: hq.authorityVisibility.orphanedPaidCustomerCount,
  },
  detail: {
    visible: Boolean(detail),
    lifecycle: detail?.overview.lifecycle,
    publicLaunch: detail?.overview.publicLaunch,
    launchedAt: detail?.overview.launchedAt,
    blockers: detail?.commercial.blockers,
    pendingFounderAction: detail?.governance.pendingFounderAction,
    founderLaunchAuthorization: detail?.governance.founderLaunchAuthorization,
    organic: detail?.growth.organic,
  },
  record: {
    public_launch_state: record?.public_launch_state,
    commercialization_state: record?.commercialization_state,
    operating_stage: record?.operating_stage,
    blocked_actions: record?.blocked_actions,
    current_experiment: record?.current_experiment,
    acquisition_state: record?.acquisition_state,
  },
  authority: {
    publicly_launched: authority?.publicly_launched,
    payment_activation: authority?.payment_activation,
    remaining_blockers: authority?.remaining_blockers,
    orphaned: authority?.orphaned_paid_customer_count,
  },
  experiment: {
    id: LOCKED_CRE_EXPERIMENT_ID,
    clockRestarted: inspectExperimentClock().restarted,
  },
  daily: {
    result: daily.snapshot.dailyResult,
    nextWork: daily.snapshot.nextGovernedWork,
  },
}, null, 2));
