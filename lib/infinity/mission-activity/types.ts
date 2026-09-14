import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type {
  ActivityExecutionClass,
  CanonicalActivityStatus,
  HqActivityRoomId,
  MISSION_ACTIVITY_MODEL,
  MissionActivityEventType,
} from "./constants";

export type MissionActivityTraceability = {
  missionId: string;
  runtimeInstanceId?: string | null;
  artifactId?: string | null;
  deploymentId?: string | null;
  experimentId?: string | null;
  candidateId?: string | null;
  workerId?: string | null;
  provider?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
};

export type GroundedProgress = {
  completedSteps: number;
  totalKnownSteps: number;
  percent: number | null;
  source: "completed_over_known" | "provider_reported" | "phase_position" | "record_count";
};

export type MissionActivityEvent = {
  schema: typeof MISSION_ACTIVITY_MODEL;
  eventId: string;
  organizationId: string;
  ventureId: string | null;
  candidateId: string | null;
  experimentId: string | null;
  missionId: string;
  missionType: string;
  engine: string;
  room: HqActivityRoomId;
  stepId: string | null;
  stepType: string;
  eventType: MissionActivityEventType;
  status: CanonicalActivityStatus;
  summary: string;
  technicalDetail: string | null;
  progress: GroundedProgress | null;
  startedAt: string | null;
  completedAt: string | null;
  observedAt: string;
  source: string;
  traceability: MissionActivityTraceability;
  synthetic: boolean;
  executionClass: ActivityExecutionClass;
  blocker: string | null;
  authorizationRequired: string | null;
  costState: "UNKNOWN" | "KNOWN" | null;
  failureCode: string | null;
};

export type CommandActivityCounts = {
  activeMissions: number;
  blockedMissions: number;
  waitingMissions: number;
  authorizationRequired: number;
};

export type CommandNowInspecting = {
  currentWorkId?: string | null;
  currentMission: string | null;
  currentPhase: string | null;
  currentStep: string | null;
  currentRoom: string | null;
  currentRooms?: string[];
  currentWorker: string | null;
  currentTask: string | null;
  status: CanonicalActivityStatus | null;
  why: string | null;
  startedAt: string | null;
  lastActivity: string | null;
  lastActivityAt: string | null;
  nextExpectedStep: string | null;
  blocker: string | null;
  authorizationRequired: string | null;
};

export type ActiveWorkerProjection = {
  workerExecutionId: string;
  missionId: string;
  stepId: string | null;
  stepType: string;
  ventureId: string | null;
  role: string;
  room: HqActivityRoomId;
  task: string;
  status: CanonicalActivityStatus;
  startedAt: string | null;
  lastActivityAt: string;
  provider: string | null;
  blocker: string | null;
  next: string | null;
};

export type CommandActivitySystemView = {
  missionId: string | null;
  engine: string | null;
  step: string | null;
  workerOrProvider: string | null;
  artifactId: string | null;
  deploymentId: string | null;
  experimentId: string | null;
  traceId: string | null;
  startedAt: string | null;
  durationMs: number | null;
  latestEvent: string | null;
  failureCode: string | null;
  costState: "UNKNOWN" | "KNOWN" | null;
};

export type RoomActivitySlice = {
  room: HqActivityRoomId;
  roomLabel: string;
  status: CanonicalActivityStatus;
  summary: string | null;
  allowAmbientMotion: boolean;
  latestEventId: string | null;
};

export type CommandActivityView = {
  generatedAt: string;
  counts: CommandActivityCounts;
  rooms: Record<DepartmentId, RoomActivitySlice>;
  nowInspecting: CommandNowInspecting;
  systemView: CommandActivitySystemView;
  latestCompleted: {
    summary: string;
    completedAt: string;
    missionType: string;
    missionId: string;
    outcome?: string | null;
  } | null;
  latestSystemActivity?: {
    workId: string;
    missionId: string;
    ventureId: string | null;
    title: string;
    classification: string;
    status: string;
    completedAt: string | null;
    updatedAt: string;
    latestOutput: string;
    trace: string;
    substantiveVentureWork: boolean;
    systemOnly: boolean;
    diagnostic: boolean;
  } | null;
  latestVentureWork?: {
    workId: string;
    work_id?: string;
    missionId: string;
    ventureId: string | null;
    title: string;
    mission_title?: string;
    classification: string;
    status: string;
    completedAt: string | null;
    updatedAt: string;
    latestOutput: string;
    startedAt?: string;
    ventureName?: string | null;
    scope?: "VENTURE" | "PORTFOLIO";
    label?: "LATEST VENTURE WORK" | "LATEST PORTFOLIO VENTURE WORK";
    trace: string;
    substantiveVentureWork: boolean;
    systemOnly: boolean;
    diagnostic: boolean;
  } | null;
  latestPortfolioVentureWork?: {
    workId: string;
    title: string;
    status: string;
    completedAt: string | null;
    classification: string;
  } | null;
  recentVentureWork?: Array<{
    workId: string;
    title: string;
    classification: string;
    status: string;
    completedAt: string | null;
    latestOutput: string;
    trace: string;
  }>;
  recentSystemActivity?: Array<{
    workId: string;
    title: string;
    classification: string;
    status: string;
    completedAt: string | null;
    latestOutput: string;
    trace: string;
  }>;
  selectedVentureId?: string | null;
  latestVentureWorkScope?: "VENTURE" | "PORTFOLIO" | null;
  latestVentureWorkLabel?: "LATEST VENTURE WORK" | "LATEST PORTFOLIO VENTURE WORK" | null;
  recentEvents: MissionActivityEvent[];
  activeWorkers: ActiveWorkerProjection[];
  executionClass: ActivityExecutionClass;
};

export type EmitMissionActivityInput = {
  organizationId: string;
  ventureId?: string | null;
  candidateId?: string | null;
  experimentId?: string | null;
  missionId: string;
  missionType: string;
  engine: string;
  room?: HqActivityRoomId;
  stepId?: string | null;
  stepType: string;
  eventType: MissionActivityEventType;
  status?: CanonicalActivityStatus;
  summary?: string;
  technicalDetail?: string | null;
  progress?: Omit<GroundedProgress, "percent"> | GroundedProgress | null;
  startedAt?: string | null;
  completedAt?: string | null;
  observedAt?: string;
  source?: string;
  traceability?: Partial<MissionActivityTraceability>;
  synthetic?: boolean;
  executionClass?: ActivityExecutionClass;
  blocker?: string | null;
  authorizationRequired?: string | null;
  costState?: "UNKNOWN" | "KNOWN" | null;
  failureCode?: string | null;
};
