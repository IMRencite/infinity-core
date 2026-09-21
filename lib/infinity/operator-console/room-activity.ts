import { humanizeTask } from "./humanize";
import { deriveRoomPresence, roomPresenceFromActivityStatus, type RoomPresenceState } from "./room-presence";
import { ALL_HQ_ROOM_IDS, getRoomDisplayNames } from "./room-naming";
import { isInternalVentureLabel, resolveVentureDisplay } from "./resolve-venture-display-name";
import { deriveUiStateFromEngineStatus } from "./status-derivation";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorVentureSnapshot,
  OperatorWorkerNode,
} from "./types";
import type { HqWorkArtifact } from "./artifacts/types";
import type { CurrentWorkNarrative } from "@/lib/infinity/current-work-narrative";
import { isGenericWorkerOnlyNow } from "@/lib/infinity/current-work-narrative";
import { isGenericImplementationText } from "@/lib/infinity/room-work/resolver";

/**
 * Deterministic HQ room activity translator.
 *
 * Implemented source priority for ACTIVE_WORK:
 * 1. Active/current room task (department.currentTask while state is RUNNING)
 * 2. Active provider operation (RUNNING session for this room)
 * 3. Active org mission / currentActivity when it targets this room
 * 4. In-progress room artifact (CREATING only — never READY/complete history)
 * 5. Active worker assignment (motionActive task text)
 * 6. Active decision / closed-loop route (Command coordination)
 * 7. Conservative room-pattern copy only when presence or RUNNING state already proves work
 * 8. Explicit idle / empty / blocked templates
 *
 * Never uses room name, venture status, stale READY artifacts, completed missions,
 * or static job descriptions as the sole proof of work. No LLM.
 */
export const ROOM_ACTIVITY_LABEL = "NOW";

export const ROOM_ACTIVITY_IDLE =
  "No active task right now. Agents are available in this room.";
export const ROOM_ACTIVITY_EMPTY = "No active work is assigned to this room.";
export const ROOM_ACTIVITY_BLOCKED_UNKNOWN =
  "Work is blocked, but no detailed blocker has been recorded.";
export const ROOM_ACTIVITY_WAITING =
  "Work is waiting. No autonomous execution is running in this room.";
export const ROOM_ACTIVITY_AUTHORIZATION =
  "Work is waiting on authorization. This room is not autonomously executing.";

export type RoomActivitySource =
  | "currentTask"
  | "provider"
  | "mission"
  | "artifact"
  | "worker"
  | "decision"
  | "idle"
  | "empty"
  | "blocker";

export type RoomActivityExplanation = {
  presence: RoomPresenceState;
  label: typeof ROOM_ACTIVITY_LABEL;
  sentence: string;
  grounded: boolean;
  source: RoomActivitySource;
  ventureName: string | null;
  why: string | null;
  activeArtifactTitle: string | null;
};

export type RoomActivityClosedLoop = {
  active: boolean;
  toDepartmentId?: DepartmentId | null;
  decisionType?: string | null;
} | null | undefined;

export type RoomActivityInput = {
  departmentId: DepartmentId;
  department?: OperatorDepartmentSnapshot | null;
  workerNodes: OperatorWorkerNode[];
  providers?: OperatorProviderSession[];
  currentActivity?: OperatorCurrentActivity | null;
  closedLoopRoute?: RoomActivityClosedLoop;
  ventureName?: string | null;
  ventureId?: string | null;
  commandRoomStatus?: string | null;
  commandRoomSummary?: string | null;
  nowInspectingTask?: string | null;
};

const UUID_IN_TEXT_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const LONG_HEX_RE = /\b[0-9a-f]{16,}\b/gi;
const ENUM_TOKEN_RE = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g;
const CAMEL_ID_RE = /\b[A-Z][A-Za-z]+(?:Step|Run|Id|UUID|Task)\b/g;

const IN_PROGRESS_DEPT = new Set<DepartmentUiState>(["RUNNING"]);
const TERMINAL_DEPT = new Set<DepartmentUiState>(["COMPLETE", "SKIPPED", "SHUTDOWN"]);

type RoomCopyVariant = {
  withVenture: (venture: string) => string;
  withoutVenture: string;
};

const ROOM_ACTIVE_COPY: Record<DepartmentId, { default: RoomCopyVariant; alt?: RoomCopyVariant; altWhen?: RegExp }> = {
  opportunity_lab: {
    default: {
      withVenture: (v) => `Scanning for new business opportunities related to ${v}.`,
      withoutVenture: "Scanning for new business opportunities.",
    },
    altWhen: /\brank/i,
    alt: {
      withVenture: () => "Ranking newly discovered opportunities by evidence and potential.",
      withoutVenture: "Ranking newly discovered opportunities by evidence and potential.",
    },
  },
  research_department: {
    default: {
      withVenture: (v) => `Comparing market demand, competitors, and customer evidence for ${v}.`,
      withoutVenture: "Comparing market demand, competitors, and customer evidence.",
    },
    altWhen: /assumption|evidence/i,
    alt: {
      withVenture: () => "Checking whether the strongest market assumptions are supported by evidence.",
      withoutVenture: "Checking whether the strongest market assumptions are supported by evidence.",
    },
  },
  strategy_finance: {
    default: {
      withVenture: (v) => `Testing pricing, margins, costs, and customer acquisition assumptions for ${v}.`,
      withoutVenture: "Testing pricing, margins, costs, and customer acquisition assumptions.",
    },
    altWhen: /revenue|model/i,
    alt: {
      withVenture: () => "Comparing revenue models to find the strongest economics.",
      withoutVenture: "Comparing revenue models to find the strongest economics.",
    },
  },
  company_operations: {
    default: {
      withVenture: (v) => `Turning ${v} into a structured business and product build plan.`,
      withoutVenture: "Turning the venture into a structured business and product build plan.",
    },
    altWhen: /operat|requirement/i,
    alt: {
      withVenture: () => "Defining the product, operating model, and major build requirements.",
      withoutVenture: "Defining the product, operating model, and major build requirements.",
    },
  },
  systems_architect: {
    default: {
      withVenture: (v) => `Mapping the operating systems ${v} needs before build or procurement.`,
      withoutVenture: "Mapping the operating systems this venture needs before build or procurement.",
    },
    altWhen: /payment|crm|tenancy/i,
    alt: {
      withVenture: () => "Selecting payment, CRM, communications, and tenancy requirements without buying software.",
      withoutVenture: "Selecting payment, CRM, communications, and tenancy requirements without buying software.",
    },
  },
  growth_department: {
    default: {
      withVenture: (v) => `Planning customer acquisition channels and organic growth for ${v}.`,
      withoutVenture: "Planning customer acquisition channels and organic growth.",
    },
    altWhen: /content|distribution/i,
    alt: {
      withVenture: (v) => `Building the content and distribution strategy for ${v}.`,
      withoutVenture: "Building the content and distribution strategy.",
    },
  },
  creative_studio: {
    default: {
      withVenture: (v) => `Creating the visual direction and customer-facing assets for ${v}.`,
      withoutVenture: "Creating the visual direction and customer-facing assets.",
    },
    altWhen: /campaign|growth/i,
    alt: {
      withVenture: () => "Preparing creative assets for the current growth campaign.",
      withoutVenture: "Preparing creative assets for the current growth campaign.",
    },
  },
  product_lab: {
    default: {
      withVenture: (v) => `Building the website and lead-capture flow for ${v}.`,
      withoutVenture: "Building the website and lead-capture flow.",
    },
    altWhen: /package|implement/i,
    alt: {
      withVenture: () => "Implementing the current product build package.",
      withoutVenture: "Implementing the current product build package.",
    },
  },
  quality_control: {
    default: {
      withVenture: () => "Checking the current build for technical, business, and launch-readiness issues.",
      withoutVenture: "Checking the current build for technical, business, and launch-readiness issues.",
    },
    altWhen: /gate|evidence|advance/i,
    alt: {
      withVenture: (v) => `Reviewing evidence and quality gates before ${v} can advance.`,
      withoutVenture: "Reviewing evidence and quality gates before the venture can advance.",
    },
  },
  launch_operations: {
    default: {
      withVenture: (v) => `Checking domain, DNS, hosting, and deployment readiness for ${v}.`,
      withoutVenture: "Checking domain, DNS, hosting, and deployment readiness.",
    },
    altWhen: /infrastructure|public|launch/i,
    alt: {
      withVenture: () => "Verifying launch infrastructure before anything goes public.",
      withoutVenture: "Verifying launch infrastructure before anything goes public.",
    },
  },
  intelligence_center: {
    default: {
      withVenture: () => "Reviewing conversion and execution signals to find the next optimization.",
      withoutVenture: "Reviewing conversion and execution signals to find the next optimization.",
    },
    altWhen: /expected|actual|performance/i,
    alt: {
      withVenture: (v) => `Comparing expected results with actual performance for ${v}.`,
      withoutVenture: "Comparing expected results with actual performance.",
    },
  },
  prospect_intelligence: {
    default: {
      withVenture: () => "Refreshing shared prospect intelligence and venture match inventory.",
      withoutVenture: "Refreshing shared prospect intelligence and venture match inventory.",
    },
    altWhen: /match|enrich|refresh/i,
    alt: {
      withVenture: () => "Resolving commercial entities and publishing ready sales inventory.",
      withoutVenture: "Resolving commercial entities and publishing ready sales inventory.",
    },
  },
  executive_office: {
    default: {
      withVenture: () => "Coordinating the next venture stage based on evidence, economics, and readiness.",
      withoutVenture: "Coordinating the next venture stage based on evidence, economics, and readiness.",
    },
    altWhen: /route|mission/i,
    alt: {
      withVenture: () => "Routing the current mission to the rooms that need to act next.",
      withoutVenture: "Routing the current mission to the rooms that need to act next.",
    },
  },
  sales_floor: {
    default: {
      withVenture: (v) => `Monitoring the sales floor and room priorities for ${v}.`,
      withoutVenture: "Monitoring the sales floor without forcing outreach.",
    },
    altWhen: /pipeline|outbound|inbound|close|train|coach|simulat/i,
    alt: {
      withVenture: () => "Advancing the highest-evidence sales room without fabricating activity.",
      withoutVenture: "Advancing the highest-evidence sales room without fabricating activity.",
    },
  },
  operations: {
    default: {
      withVenture: (v) => `Reporting current operating state for ${v} and the rest of the portfolio.`,
      withoutVenture: "Reporting what Infinity and its ventures are doing operationally.",
    },
    altWhen: /observ|runtime|cycle/i,
    alt: {
      withVenture: () => "Watching scheduled runtime, blockers, and the next operating cycle.",
      withoutVenture: "Watching scheduled runtime, blockers, and the next operating cycle.",
    },
  },
};

const SOURCE_WHY: Record<Exclude<RoomActivitySource, "idle" | "empty" | "blocker">, string> = {
  currentTask: "This room has an active task right now.",
  provider: "An agent is currently working in this room.",
  mission: "The current mission is assigned to this room.",
  artifact: "This room is creating an in-progress output.",
  worker: "Agents in this room are currently working.",
  decision: "Command is coordinating the next step.",
};

function readTrimmed(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function publicVentureNameForActivity(
  rawName: string | null | undefined,
  ventureId?: string | null,
): string | null {
  const trimmed = readTrimmed(rawName);
  if (!trimmed) return null;
  if (isInternalVentureLabel(trimmed)) return null;
  const resolved = resolveVentureDisplay({
    id: ventureId,
    displayName: trimmed,
    workingName: trimmed,
    name: trimmed,
  });
  if (isInternalVentureLabel(resolved.name)) return null;
  if (resolved.name === "Unnamed Venture") return null;
  return resolved.name;
}

export function stripInternalTokens(text: string): string {
  return text
    .replace(UUID_IN_TEXT_RE, " ")
    .replace(LONG_HEX_RE, " ")
    .replace(ENUM_TOKEN_RE, " ")
    .replace(CAMEL_ID_RE, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function looksLikeOpaqueIdentifier(text: string | null | undefined): boolean {
  const raw = readTrimmed(text);
  if (!raw) return true;
  if (ALL_HQ_ROOM_IDS.includes(raw as DepartmentId)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) return true;
  if (/^[0-9a-f]{8,32}$/i.test(raw)) return true;
  if (/^[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(raw)) return true;
  const stripped = stripInternalTokens(raw);
  if (!stripped) return true;
  if (!/[a-zA-Z]/.test(stripped)) return true;
  return false;
}

function isFixtureArtifact(artifact: HqWorkArtifact): boolean {
  const fields = [artifact.title, artifact.subtitle, artifact.lineageLabel];
  return fields.some((field) => {
    const value = readTrimmed(field);
    return Boolean(value && isInternalVentureLabel(value));
  });
}

function inProgressArtifact(artifacts: HqWorkArtifact[] | undefined): HqWorkArtifact | null {
  if (!artifacts) return null;
  return (
    artifacts.find((artifact) => artifact.state === "CREATING" && !isFixtureArtifact(artifact)) ?? null
  );
}

function providerIsRunning(session: OperatorProviderSession): boolean {
  return deriveUiStateFromEngineStatus(session.status) === "RUNNING";
}

function departmentIsInProgress(state: DepartmentUiState | undefined): boolean {
  return Boolean(state && IN_PROGRESS_DEPT.has(state));
}

function normalizeCopy(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").toLowerCase();
}

function isRoomIdentityCopy(departmentId: DepartmentId, text: string): boolean {
  const names = getRoomDisplayNames(departmentId);
  const normalized = normalizeCopy(text);
  return [names.displayName, names.shortDescription, names.expandedDescription, names.supportingLabel].some(
    (value) => normalizeCopy(value) === normalized,
  );
}

function punctuateSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function exactWorkSentence(input: {
  departmentId: DepartmentId;
  hint: string | null;
  liveSentence: string | null;
  venture: string | null;
}): string | null {
  for (const raw of [input.liveSentence, input.hint]) {
    const value = readTrimmed(raw);
    if (!value || looksLikeOpaqueIdentifier(value)) continue;
    if (isGenericWorkerOnlyNow(value) || isGenericImplementationText(value)) continue;
    if (isRoomIdentityCopy(input.departmentId, value)) continue;
    if (value.split(/\s+/).length < 3 && value.length < 18) continue;
    let sentence = stripInternalTokens(value.replace(/^Continue\s+/i, ""));
    if (!sentence || looksLikeOpaqueIdentifier(sentence) || isRoomIdentityCopy(input.departmentId, sentence)) continue;
    if (
      input.venture &&
      sentence.length < 70 &&
      !sentence.toLowerCase().includes(input.venture.toLowerCase()) &&
      !/\bfor\b/i.test(sentence)
    ) {
      sentence = `${sentence.replace(/[.!?]+$/g, "")} for ${input.venture}`;
    }
    return punctuateSentence(sentence);
  }
  return null;
}

function applyRoomCopy(departmentId: DepartmentId, venture: string | null, hint: string | null): string {
  const pack = ROOM_ACTIVE_COPY[departmentId];
  const variant = hint && pack.altWhen?.test(hint) && pack.alt ? pack.alt : pack.default;
  return venture ? variant.withVenture(venture) : variant.withoutVenture;
}

function commandCoordinationSentence(input: {
  closedLoopRoute?: RoomActivityClosedLoop;
  currentActivity?: OperatorCurrentActivity | null;
  department?: OperatorDepartmentSnapshot | null;
  venture: string | null;
  hint: string | null;
}): string | null {
  const route = input.closedLoopRoute;
  if (route?.active && route.toDepartmentId) {
    const target = getRoomDisplayNames(route.toDepartmentId).displayName;
    return `Sending the current venture to ${target}.`;
  }

  const activity = input.currentActivity;
  if (activity?.active && activity.departmentId && activity.departmentId !== "executive_office") {
    const target = getRoomDisplayNames(activity.departmentId).displayName;
    return `Routing the current mission to ${target}.`;
  }

  const decision = readTrimmed(route?.decisionType ?? input.department?.summary);
  const decisionKey = decision?.toUpperCase() ?? "";
  if (decisionKey === "PAUSE") {
    return "Waiting for stronger evidence before approving the next stage.";
  }
  if (decisionKey === "LAUNCH") {
    return "Coordinating deployment readiness checks across provider systems.";
  }

  if (activity?.active || departmentIsInProgress(input.department?.state)) {
    return applyRoomCopy("executive_office", input.venture, input.hint ?? decision);
  }

  return null;
}

function blockerSentence(
  department: OperatorDepartmentSnapshot | null | undefined,
  commandRoomSummary?: string | null,
  nowInspectingTask?: string | null,
): string {
  const candidates = [
    commandRoomSummary,
    nowInspectingTask,
    department?.displaySummary,
    department?.summary,
    department?.currentTask,
    department?.latestRawStatus,
  ];
  for (const candidate of candidates) {
    const raw = readTrimmed(candidate);
    if (!raw || looksLikeOpaqueIdentifier(raw)) continue;
    const cleaned = stripInternalTokens(raw);
    if (!cleaned || looksLikeOpaqueIdentifier(cleaned)) continue;
    if (/^(blocked|failed|error|waiting|paused)$/i.test(cleaned)) continue;
    if (!cleaned.endsWith(".")) return `${cleaned}.`;
    return cleaned;
  }
  return ROOM_ACTIVITY_BLOCKED_UNKNOWN;
}

type Grounding = {
  source: Exclude<RoomActivitySource, "idle" | "empty" | "blocker">;
  hint: string | null;
  artifactTitle: string | null;
};

function liveCommandSentence(input: RoomActivityInput): string | null {
  if (!input.commandRoomStatus || input.commandRoomStatus === "EMPTY" || input.commandRoomStatus === "PRESENT_IDLE") {
    return null;
  }
  const candidates = [input.commandRoomSummary, input.nowInspectingTask];
  for (const candidate of candidates) {
    const raw = readTrimmed(candidate);
    if (!raw || looksLikeOpaqueIdentifier(raw)) continue;
    const cleaned = stripInternalTokens(humanizeTask(raw) ?? raw);
    if (!cleaned || looksLikeOpaqueIdentifier(cleaned)) continue;
    return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
  }
  return null;
}

function pickActiveGrounding(input: RoomActivityInput): Grounding | null {
  const dept = input.department ?? null;
  const hintFrom = (raw: string | null | undefined) => {
    const value = readTrimmed(raw);
    if (!value || looksLikeOpaqueIdentifier(value)) return null;
    return stripInternalTokens(humanizeTask(value) ?? value);
  };

  if (input.commandRoomStatus === "ACTIVE_WORK") {
    return {
      source: "mission",
      hint: hintFrom(input.commandRoomSummary ?? input.nowInspectingTask),
      artifactTitle: null,
    };
  }

  if (dept && departmentIsInProgress(dept.state) && !TERMINAL_DEPT.has(dept.state)) {
    const taskHint = hintFrom(dept.currentTask);
    if (dept.currentTask && !looksLikeOpaqueIdentifier(dept.currentTask)) {
      return { source: "currentTask", hint: taskHint, artifactTitle: null };
    }
    if (dept.currentTask) {
      return { source: "currentTask", hint: null, artifactTitle: null };
    }
  }

  const runningProvider = (input.providers ?? []).find(
    (session) => session.departmentId === input.departmentId && providerIsRunning(session),
  );
  if (runningProvider) {
    return {
      source: "provider",
      hint: hintFrom(runningProvider.displayTask ?? runningProvider.task),
      artifactTitle: null,
    };
  }

  const activity = input.currentActivity;
  if (activity?.active && activity.departmentId === input.departmentId) {
    return { source: "mission", hint: hintFrom(activity.displayTask ?? activity.task), artifactTitle: null };
  }

  if (dept && departmentIsInProgress(dept.state)) {
    const artifact = inProgressArtifact(dept.workArtifacts);
    if (artifact) {
      return {
        source: "artifact",
        hint: hintFrom(artifact.title),
        artifactTitle: looksLikeOpaqueIdentifier(artifact.title) || isFixtureArtifact(artifact) ? null : stripInternalTokens(artifact.title),
      };
    }
  }

  const activeWorker = input.workerNodes.find((node) => node.motionActive && node.isActive);
  if (activeWorker) {
    return { source: "worker", hint: hintFrom(activeWorker.displayTask ?? activeWorker.task), artifactTitle: null };
  }

  if (input.departmentId === "executive_office") {
    const route = input.closedLoopRoute;
    if (route?.active && route.toDepartmentId) {
      return { source: "decision", hint: "route", artifactTitle: null };
    }
    if (activity?.active) {
      return { source: "decision", hint: hintFrom(activity.displayTask ?? activity.task), artifactTitle: null };
    }
  }

  return null;
}

function hasProvenActiveWork(input: RoomActivityInput, grounding: Grounding | null, workerPresence: RoomPresenceState): boolean {
  if (input.commandRoomStatus === "ACTIVE_WORK") return true;
  if (workerPresence === "BLOCKED") return false;
  if (grounding) return true;
  if (workerPresence === "ACTIVE_WORK") return true;
  if (departmentIsInProgress(input.department?.state) && input.department?.isActive) return true;
  if (
    input.departmentId === "executive_office" &&
    (input.closedLoopRoute?.active || input.currentActivity?.active)
  ) {
    return true;
  }
  return false;
}

function resolvePresence(
  workerPresence: RoomPresenceState,
  provenActive: boolean,
  outputCount = 0,
): RoomPresenceState {
  if (workerPresence === "BLOCKED") return "BLOCKED";
  if (provenActive) return "ACTIVE_WORK";
  if (workerPresence === "EMPTY" && outputCount > 0) return "PRESENT_IDLE";
  return workerPresence;
}

export function buildRoomActivityExplanation(input: RoomActivityInput): RoomActivityExplanation {
  const narrative = input.department?.detail?.currentWorkNarrative as CurrentWorkNarrative | undefined;
  if (
    narrative?.displayText &&
    !isGenericWorkerOnlyNow(narrative.displayText) &&
    !isRoomIdentityCopy(input.departmentId, narrative.displayText) &&
    !isGenericImplementationText(narrative.displayText)
  ) {
    const presence: RoomPresenceState = narrative.state === "ACTIVE"
      ? "ACTIVE_WORK"
      : narrative.state === "BLOCKED"
        ? "BLOCKED"
        : "PRESENT_IDLE";
    return {
      presence,
      label: ROOM_ACTIVITY_LABEL,
      sentence: narrative.displayText,
      grounded: true,
      source: "currentTask",
      ventureName: publicVentureNameForActivity(input.ventureName, input.ventureId),
      why: narrative.purpose,
      activeArtifactTitle: null,
    };
  }
  const commandPresence = roomPresenceFromActivityStatus(input.commandRoomStatus);
  const outputCount = input.department?.workArtifacts?.length ?? 0;
  const workerPresence =
    commandPresence ??
    deriveRoomPresence(input.workerNodes, input.department?.state ?? "NOT_STARTED", false, {
      outputCount,
      currentWorkCount: input.department?.currentTask ? 1 : 0,
    }).state;
  const ventureName = publicVentureNameForActivity(input.ventureName, input.ventureId);
  const grounding = pickActiveGrounding(input);
  const provenActive = hasProvenActiveWork(input, grounding, workerPresence);
  const presence = resolvePresence(workerPresence, provenActive, outputCount);

  if (presence === "EMPTY") {
    return {
      presence,
      label: ROOM_ACTIVITY_LABEL,
      sentence: ROOM_ACTIVITY_EMPTY,
      grounded: true,
      source: "empty",
      ventureName,
      why: null,
      activeArtifactTitle: null,
    };
  }

  if (input.commandRoomStatus === "WAITING_EXTERNAL" || input.commandRoomStatus === "WAITING_INTERNAL") {
    const waitingTask = input.nowInspectingTask ?? input.commandRoomSummary;
    const authorization = input.commandRoomStatus === "WAITING_EXTERNAL";
    return {
      presence: "PRESENT_IDLE",
      label: ROOM_ACTIVITY_LABEL,
      sentence: waitingTask
        ? `${authorization ? "Authorization required: " : "Waiting: "}${waitingTask}`
        : authorization
          ? ROOM_ACTIVITY_AUTHORIZATION
          : ROOM_ACTIVITY_WAITING,
      grounded: true,
      source: "mission",
      ventureName,
      why: authorization ? ROOM_ACTIVITY_AUTHORIZATION : ROOM_ACTIVITY_WAITING,
      activeArtifactTitle: null,
    };
  }

  if (presence === "BLOCKED") {
    const sentence = blockerSentence(input.department, input.commandRoomSummary, input.nowInspectingTask);
    return {
      presence,
      label: ROOM_ACTIVITY_LABEL,
      sentence,
      grounded: true,
      source: "blocker",
      ventureName,
      why: sentence,
      activeArtifactTitle: null,
    };
  }

  if (presence === "PRESENT_IDLE" || !provenActive) {
    return {
      presence: "PRESENT_IDLE",
      label: ROOM_ACTIVITY_LABEL,
      sentence: ROOM_ACTIVITY_IDLE,
      grounded: true,
      source: "idle",
      ventureName,
      why: "Agents are present, but no current task is assigned.",
      activeArtifactTitle: null,
    };
  }

  const hint = grounding?.hint ?? null;
  const liveSentence = liveCommandSentence(input);
  const exact = exactWorkSentence({
    departmentId: input.departmentId,
    hint,
    liveSentence,
    venture: ventureName,
  });
  let sentence: string;
  if (exact) {
    sentence = exact;
  } else if (input.departmentId === "executive_office") {
    sentence =
      commandCoordinationSentence({
        closedLoopRoute: input.closedLoopRoute,
        currentActivity: input.currentActivity,
        department: input.department,
        venture: ventureName,
        hint,
      }) ?? applyRoomCopy("executive_office", ventureName, hint);
  } else {
    sentence = applyRoomCopy(input.departmentId, ventureName, hint);
  }

  sentence = stripInternalTokens(sentence);
  if (!sentence || isRoomIdentityCopy(input.departmentId, sentence)) {
    sentence = applyRoomCopy(input.departmentId, null, hint);
  }

  const source = grounding?.source ?? "worker";
  return {
    presence: "ACTIVE_WORK",
    label: ROOM_ACTIVITY_LABEL,
    sentence,
    grounded: true,
    source,
    ventureName,
    why: SOURCE_WHY[source],
    activeArtifactTitle: grounding?.artifactTitle ?? null,
  };
}

export function explainSnapshotDepartmentActivity(
  snapshot: Pick<
    OperatorVentureSnapshot,
    "currentActivity" | "closedLoopRoute" | "venture" | "providers"
  >,
  department: OperatorDepartmentSnapshot,
  workerNodes: OperatorWorkerNode[],
): RoomActivityExplanation {
  return buildRoomActivityExplanation({
    departmentId: department.id,
    department,
    workerNodes: workerNodes.filter((node) => node.departmentId === department.id),
    providers: snapshot.providers.filter((session) => session.departmentId === department.id),
    currentActivity: snapshot.currentActivity,
    closedLoopRoute: snapshot.closedLoopRoute,
    ventureName: snapshot.venture.ventureName,
    ventureId: snapshot.venture.ventureAssemblyId,
  });
}
