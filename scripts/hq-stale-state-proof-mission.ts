import { emitMissionActivity } from "../lib/infinity/mission-activity/emit";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { upsertCanonicalWork } from "../lib/infinity/canonical-work/store";
import { CANONICAL_WORK_EXECUTION_CONTRACT } from "../lib/infinity/canonical-work/types";

const WORK_ID = "work:hq:stale-state-physical-proof";
const MISSION_ID = "mission:hq:stale-state-physical-proof";

const phase = process.argv[2] ?? "start";
const token = process.argv[3] ?? `catchup-${Date.now()}`;
const now = new Date().toISOString();

if (phase === "mark") {
  upsertCanonicalWork({
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: WORK_ID,
    mission_id: MISSION_ID,
    venture_id: CRE_VENTURE_ID,
    work_type: "QC",
    title: "HQ stale-state physical proof",
    description: "Outside-HQ marker for focus/restart catch-up proof.",
    stage: "QC",
    status: "ACTIVE",
    assigned_rooms: ["operations", "systems_architect", "quality_control"],
    assigned_workers: ["Venture Operator", "Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: null,
    blocked_reason: null,
    authorization_state: null,
    progress: "ACTIVE",
    latest_output: token,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [],
    requires_infinity_worker_execution: false,
    next_expected_transition: "Focus or restart must surface this marker",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: CRE_VENTURE_ID,
    missionId: MISSION_ID,
    missionType: "HQ_STALE_STATE_PHYSICAL_PROOF",
    engine: "quality_control",
    stepType: "HQ_LIVE_CATCHUP",
    eventType: "STEP_PROGRESS",
    summary: token,
    executionClass: "VENTURE_EXECUTION",
  });
  console.log(JSON.stringify({ phase, workId: WORK_ID, missionId: MISSION_ID, at: now, token, status: "ACTIVE" }));
  process.exit(0);
}

if (phase === "complete") {
  upsertCanonicalWork({
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: WORK_ID,
    mission_id: MISSION_ID,
    venture_id: CRE_VENTURE_ID,
    work_type: "QC",
    title: "HQ stale-state physical proof",
    description: "Outside-HQ completion for live catch-up proof.",
    stage: "QC",
    status: "COMPLETED",
    assigned_rooms: ["operations", "systems_architect", "quality_control"],
    assigned_workers: ["Venture Operator", "Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: now,
    blocked_reason: null,
    authorization_state: null,
    progress: "COMPLETED",
    latest_output: "HQ must show completion without a manual refresh",
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [],
    requires_infinity_worker_execution: false,
    next_expected_transition: "FOUNDER_LIVE_HQ_RECHECK_REQUIRED",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: CRE_VENTURE_ID,
    missionId: MISSION_ID,
    missionType: "HQ_STALE_STATE_PHYSICAL_PROOF",
    engine: "quality_control",
    stepType: "HQ_LIVE_CATCHUP",
    eventType: "MISSION_COMPLETED",
    summary: "HQ stale-state physical proof completed outside the HQ tab.",
    executionClass: "VENTURE_EXECUTION",
  });
  console.log(JSON.stringify({ phase, workId: WORK_ID, missionId: MISSION_ID, at: now, status: "COMPLETED" }));
  process.exit(0);
}

upsertCanonicalWork({
  contract: CANONICAL_WORK_EXECUTION_CONTRACT,
  work_id: WORK_ID,
  mission_id: MISSION_ID,
  venture_id: CRE_VENTURE_ID,
  work_type: "QC",
  title: "HQ stale-state physical proof",
  description: "Outside-HQ start for live catch-up proof.",
  stage: "QC",
  status: "ACTIVE",
  assigned_rooms: ["operations", "systems_architect", "quality_control"],
  assigned_workers: ["Venture Operator", "Validation Station"],
  source: "EXTERNAL_IMPLEMENTATION_AGENT",
  started_at: now,
  updated_at: now,
  completed_at: null,
  blocked_reason: null,
  authorization_state: null,
  progress: "ACTIVE",
  latest_output: "HQ must show this mission without a manual refresh",
  artifact_refs: [],
  evidence_refs: [],
  parent_work_id: null,
  traceability_links: [],
  requires_infinity_worker_execution: false,
  next_expected_transition: "Complete from outside HQ",
});
emitMissionActivity({
  organizationId: LIVE_ORG,
  ventureId: CRE_VENTURE_ID,
  missionId: MISSION_ID,
  missionType: "HQ_STALE_STATE_PHYSICAL_PROOF",
  engine: "quality_control",
  stepType: "HQ_LIVE_CATCHUP",
  eventType: "MISSION_STARTED",
  summary: "HQ stale-state physical proof started outside the HQ tab.",
  executionClass: "VENTURE_EXECUTION",
});
emitMissionActivity({
  organizationId: LIVE_ORG,
  ventureId: CRE_VENTURE_ID,
  missionId: MISSION_ID,
  missionType: "HQ_STALE_STATE_PHYSICAL_PROOF",
  engine: "quality_control",
  stepType: "HQ_LIVE_CATCHUP",
  eventType: "STEP_STARTED",
  summary: "Worker proving HQ live catch-up.",
  executionClass: "VENTURE_EXECUTION",
});
console.log(JSON.stringify({ phase, workId: WORK_ID, missionId: MISSION_ID, at: now, status: "ACTIVE" }));
