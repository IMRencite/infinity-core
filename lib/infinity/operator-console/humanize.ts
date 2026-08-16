import type {
  DepartmentId,
  DepartmentUiState,
  FailureSemantics,
  OperatorActivityEvent,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorRoomArtifact,
} from "./types";
import { deriveUiStateFromEngineStatus } from "./status-derivation";

const RUNNING = new Set(["running", "ingesting", "analyzing", "generating", "processing", "executing", "in_progress", "active", "building"]);
const COMPLETE = new Set(["completed", "complete", "ready", "succeeded", "success", "passed", "approved"]);

const DEPARTMENT_HEADLINES: Record<
  DepartmentId,
  { active: string; idle: string; complete: string; blocked: string; failed: string }
> = {
  opportunity_lab: {
    active: "Scanning for promising venture ideas",
    idle: "Standing by to scan",
    complete: "Opportunity signals reviewed",
    blocked: "Scan paused",
    failed: "Scan failed",
  },
  research_department: {
    active: "Studying the market and validating demand",
    idle: "Research grid standing by",
    complete: "Market evidence gathered",
    blocked: "Research blocked",
    failed: "Research run failed",
  },
  strategy_finance: {
    active: "Defining the revenue strategy",
    idle: "Profit lab ready",
    complete: "Revenue strategy defined",
    blocked: "Planning blocked",
    failed: "Strategy planning failed",
  },
  company_operations: {
    active: "Structuring the venture",
    idle: "Blueprint lab ready",
    complete: "Venture structure ready",
    blocked: "Formation blocked",
    failed: "Structure build failed",
  },
  growth_department: {
    active: "Planning how the venture gets discovered",
    idle: "Growth nexus ready",
    complete: "Growth plan prepared",
    blocked: "Growth planning blocked",
    failed: "Growth planning failed",
  },
  creative_studio: {
    active: "Creating visual direction",
    idle: "Design core ready",
    complete: "Visual assets ready",
    blocked: "Media generation blocked",
    failed: "Media generation failed",
  },
  product_lab: {
    active: "Building the first working version",
    idle: "Creation lab ready",
    complete: "Product build complete",
    blocked: "Product build blocked",
    failed: "Product build failed",
  },
  quality_control: {
    active: "Checking what is ready",
    idle: "Validation station ready",
    complete: "Quality pass complete",
    blocked: "Quality review blocked",
    failed: "Quality review failed",
  },
  launch_operations: {
    active: "Preparing the launch",
    idle: "Deployment depot ready",
    complete: "Launch action completed",
    blocked: "Launch blocked",
    failed: "Launch action failed",
  },
  intelligence_center: {
    active: "Reviewing results and performance",
    idle: "Signal intelligence ready",
    complete: "Performance reviewed",
    blocked: "Performance review blocked",
    failed: "Performance review failed",
  },
  executive_office: {
    active: "Choosing what happens next",
    idle: "Command standing by",
    complete: "Decision recorded",
    blocked: "Decision blocked",
    failed: "Decision failed",
  },
};

const HISTORICAL_FAILURE_HEADLINES: Partial<Record<DepartmentId, string>> = {
  strategy_finance: "An earlier strategy pass did not complete",
  company_operations: "An earlier structure pass did not complete",
  research_department: "An earlier research pass did not complete",
  product_lab: "An earlier build pass did not complete",
  creative_studio: "An earlier design pass did not complete",
  growth_department: "An earlier growth pass did not complete",
  quality_control: "An earlier review pass did not complete",
  launch_operations: "An earlier launch pass did not complete",
  intelligence_center: "An earlier review pass did not complete",
  opportunity_lab: "An earlier scan pass did not complete",
  executive_office: "An earlier decision pass did not complete",
};

const CURRENT_FAILURE_HEADLINES: Partial<Record<DepartmentId, string>> = {
  strategy_finance: "Infinity could not complete the revenue strategy",
  company_operations: "Infinity could not complete the venture structure",
  research_department: "Infinity could not complete the market research",
  product_lab: "Infinity could not complete the product build",
  creative_studio: "Infinity could not complete the visual direction",
  growth_department: "Infinity could not complete the growth plan",
  quality_control: "Infinity could not complete the quality review",
  launch_operations: "Infinity could not complete the launch action",
  intelligence_center: "Infinity could not complete the performance review",
  opportunity_lab: "Infinity could not complete the opportunity scan",
  executive_office: "Infinity could not complete the decision",
};

const ROLE_LABELS: Record<string, string> = {
  IMPLEMENTER: "Implementer",
  REVIEWER: "Reviewer",
  RESEARCH_PROVIDER: "Research",
  MEDIA_PROVIDER: "Generator",
  ROUTED_MODEL: "Analysis",
  AI_SESSION: "Session",
  WORK: "Work session",
};

const TASK_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: RegExpMatchArray) => string) }> = [
  { pattern: /^PAB V2\.1 build task$/i, replacement: "Building the first working version" },
  { pattern: /^Generate (\w+)$/i, replacement: (m) => `Creating a new ${humanizeMediaType(m[1] ?? "visual")} asset` },
  { pattern: /^Grounded research$/i, replacement: "Studying the market and validating demand" },
  { pattern: /workspace mutation applied/i, replacement: "Applied the latest product changes" },
  { pattern: /creative media generation job started/i, replacement: "Creating a new visual asset" },
  { pattern: /grounded research run initialized/i, replacement: "Started validating the market" },
  { pattern: /monetization plan persisted/i, replacement: "Defined the first revenue strategy" },
  { pattern: /performance observations ingested/i, replacement: "Reviewing performance signals" },
  { pattern: /learning decision created/i, replacement: "Choosing the next mission" },
  { pattern: /multiple departments active/i, replacement: "Working across multiple departments" },
];

const EVENT_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: RegExpMatchArray) => string) }> = [
  { pattern: /^MonetizationPlan (.+)$/i, replacement: (m) => `Defined the first revenue strategy: ${m[1]}` },
  { pattern: /^Monetization run (.+)$/i, replacement: (m) => `Worked on monetization (${m[1]})` },
  { pattern: /^Grounded research (.+)$/i, replacement: (m) => humanizeResearchStatus(m[1] ?? "") },
  { pattern: /^AI Brain reasoning (.+)$/i, replacement: (m) => `Reasoning through the evidence (${m[1]})` },
  { pattern: /^PAB V2\.1 run (.+)$/i, replacement: (m) => humanizePabRunStatus(m[1] ?? "") },
  { pattern: /^CodeChangeSet (.+)$/i, replacement: (m) => humanizeChangeSetStatus(m[1] ?? "") },
  { pattern: /^Media job (.+)$/i, replacement: (m) => humanizeMediaJob(m[1] ?? "") },
  { pattern: /^External action (.+)$/i, replacement: (m) => humanizeExternalAction(m[1] ?? "") },
  { pattern: /^LearningDecision: (.+)$/i, replacement: (m) => humanizeDecisionType(m[1] ?? "") },
  { pattern: /^Opportunity candidate (.+)$/i, replacement: (m) => `Reviewed opportunity: ${m[1]}` },
  { pattern: /^Opportunity (.+)$/i, replacement: (m) => `Tracking opportunity: ${m[1]}` },
  { pattern: /^Quality review (.+)$/i, replacement: (m) => humanizeQualityReview(m[1] ?? "") },
  { pattern: /^Performance intelligence (.+)$/i, replacement: (m) => humanizePerformanceStatus(m[1] ?? "") },
  { pattern: /^Organic growth (.+)$/i, replacement: (m) => humanizeOrganicGrowth(m[1] ?? "") },
  { pattern: /^Company builder run (.+)$/i, replacement: (m) => humanizeCompanyBuilder(m[1] ?? "") },
  { pattern: /^Venture selection (.+)$/i, replacement: (m) => `Selected the venture direction (${m[1]})` },
  { pattern: /^Optimization opportunity created$/i, replacement: "Identified a possible improvement" },
  { pattern: /^External action completed$/i, replacement: "Completed the launch action" },
  { pattern: /^Grounded research run started$/i, replacement: "Started validating the market" },
  { pattern: /^Creative media generation job completed$/i, replacement: "Finished creating a visual asset" },
];

function humanizeMediaType(type: string): string {
  const map: Record<string, string> = {
    image: "visual",
    video: "video",
    audio: "audio",
    landing_page: "landing page",
    hero: "hero visual",
  };
  return map[type.toLowerCase()] ?? type.replace(/_/g, " ");
}

function humanizeResearchStatus(status: string): string {
  const s = status.toLowerCase();
  if (RUNNING.has(s)) return "Studying the market and validating demand";
  if (COMPLETE.has(s)) return "Finished validating market demand";
  return `Research activity (${status})`;
}

function humanizePabRunStatus(status: string): string {
  const s = status.toLowerCase();
  if (RUNNING.has(s)) return "Building the first working version";
  if (COMPLETE.has(s)) return "Finished building the working version";
  return `Product build (${status})`;
}

function humanizeChangeSetStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("applied")) return "Applied the latest product changes";
  return `Product changes (${status})`;
}

function humanizeMediaJob(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("image") || lower.includes("visual")) return "Creating a new visual asset";
  if (RUNNING.has(lower)) return "Creating supporting visuals";
  return `Media work (${raw})`;
}

function humanizeExternalAction(raw: string): string {
  if (/completed|success/i.test(raw)) return "Completed the launch action";
  if (/blocked|failed/i.test(raw)) return "Launch action blocked";
  if (/running|execut/i.test(raw)) return "Executing the launch action";
  return `Launch action (${raw})`;
}

function humanizeDecisionType(type: string): string {
  const map: Record<string, string> = {
    REPAIR: "Chose the next repair mission",
    OPTIMIZE: "Chose to optimize the venture",
    CONTINUE: "Chose to continue the current mission",
    PAUSE: "Chose to pause the venture",
    LAUNCH: "Chose to proceed toward launch",
  };
  const key = type.toUpperCase().trim();
  return map[key] ?? `Executive decision: ${type.replace(/_/g, " ").toLowerCase()}`;
}

function humanizeQualityReview(raw: string): string {
  if (/pass|approved|success/i.test(raw)) return "Quality check passed";
  if (/fail|reject/i.test(raw)) return "Quality issues found";
  return `Quality review (${raw})`;
}

function humanizePerformanceStatus(status: string): string {
  const s = status.toLowerCase();
  if (RUNNING.has(s)) return "Reviewing performance signals";
  if (COMPLETE.has(s)) return "Finished reviewing performance";
  return `Performance review (${status})`;
}

function humanizeOrganicGrowth(raw: string): string {
  if (RUNNING.has(raw.toLowerCase())) return "Planning how the venture gets discovered";
  return `Growth planning (${raw})`;
}

function humanizeCompanyBuilder(raw: string): string {
  if (RUNNING.has(raw.toLowerCase())) return "Structuring the venture blueprint";
  return `Company structure (${raw})`;
}

export function humanizeDepartmentState(state: DepartmentUiState): string {
  const map: Record<DepartmentUiState, string> = {
    RUNNING: "In progress",
    COMPLETE: "Complete",
    WAITING: "Waiting",
    BLOCKED: "Blocked",
    FAILED: "Failed",
    SKIPPED: "Skipped",
    NOT_STARTED: "Not started",
    UNKNOWN: "Unknown",
    PAUSED: "Paused",
    SHUTDOWN: "Shutdown",
  };
  return map[state] ?? state.replace(/_/g, " ");
}

export function humanizeRole(role: string): string {
  return ROLE_LABELS[role.toUpperCase()] ?? role.replace(/_/g, " ");
}

export function humanizeTask(raw: string | null | undefined): string | null {
  if (!raw) return null;
  for (const { pattern, replacement } of TASK_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      return typeof replacement === "function" ? replacement(match) : replacement;
    }
  }
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeEventSummary(event: Pick<OperatorActivityEvent, "eventType" | "summary" | "status">): string {
  for (const { pattern, replacement } of EVENT_PATTERNS) {
    const match = event.summary.match(pattern);
    if (match) {
      return typeof replacement === "function" ? replacement(match) : replacement;
    }
  }
  return humanizeTask(event.summary) ?? event.summary;
}

export function humanizeEventStatus(status: string | null): string | null {
  if (!status) return null;
  const ui = deriveUiStateFromEngineStatus(status);
  return humanizeDepartmentState(ui);
}

export function humanizeDepartmentHeadline(
  departmentId: DepartmentId,
  state: DepartmentUiState,
  failureSemantics?: FailureSemantics,
): string {
  if (failureSemantics === "HISTORICAL_FAILURE") {
    return HISTORICAL_FAILURE_HEADLINES[departmentId] ?? "An earlier pass did not complete";
  }
  if (failureSemantics === "CURRENT_BLOCKING_FAILURE") {
    return CURRENT_FAILURE_HEADLINES[departmentId] ?? "Needs attention";
  }
  const headlines = DEPARTMENT_HEADLINES[departmentId];
  if (state === "RUNNING" || state === "WAITING") return headlines.active;
  if (state === "COMPLETE") return headlines.complete;
  if (state === "BLOCKED") return headlines.blocked;
  if (state === "FAILED") return headlines.failed;
  return headlines.idle;
}

export function humanizeDepartmentSummary(
  department: Pick<
    OperatorDepartmentSnapshot,
    "id" | "state" | "summary" | "currentTask" | "recordCount" | "failureSemantics"
  >,
): string | null {
  if (department.failureSemantics === "HISTORICAL_FAILURE") {
    return HISTORICAL_FAILURE_HEADLINES[department.id] ?? "Earlier run needs review";
  }
  if (department.failureSemantics === "CURRENT_BLOCKING_FAILURE") {
    return CURRENT_FAILURE_HEADLINES[department.id] ?? "Needs attention";
  }
  if (department.currentTask && department.state === "RUNNING") {
    return humanizeTask(department.currentTask);
  }
  if (department.summary) {
    if (department.id === "executive_office") {
      return humanizeDecisionType(department.summary);
    }
    if (department.id === "intelligence_center" && department.summary.includes("execution_success_rate")) {
      return "Reviewing performance signals";
    }
    return humanizeTask(department.summary) ?? department.summary;
  }
  if (department.recordCount > 0) {
    return humanizeDepartmentHeadline(department.id, department.state);
  }
  return null;
}

export function humanizeCurrentActivityNarration(activity: OperatorCurrentActivity): string | null {
  if (activity.active) {
    const task = humanizeTask(activity.task);
    if (task) return task;
    if (activity.departmentDisplayName ?? activity.departmentLabel) {
      return `Working in ${activity.departmentDisplayName ?? activity.departmentLabel}`;
    }
    return "Working on the venture";
  }
  if (activity.latestActivitySummary) {
    return humanizeEventSummary({
      eventType: "idle",
      summary: activity.latestActivitySummary,
      status: null,
    });
  }
  return "No active work right now";
}

export function humanizeProviderSession(session: OperatorProviderSession): {
  displayRole: string;
  displayTask: string | null;
  displayStatus: string;
} {
  return {
    displayRole: humanizeRole(session.role),
    displayTask: humanizeTask(session.task ?? session.role),
    displayStatus: humanizeDepartmentState(deriveUiStateFromEngineStatus(session.status)),
  };
}

export function buildRoomArtifacts(department: OperatorDepartmentSnapshot): OperatorRoomArtifact[] {
  const artifacts: OperatorRoomArtifact[] = [];
  const detail = department.detail;

  switch (department.id) {
    case "opportunity_lab": {
      const candidates = (detail.candidates as unknown[] | undefined) ?? [];
      if (candidates.length > 0) {
        artifacts.push({
          id: "opp-candidates",
          label: `${candidates.length} ${candidates.length === 1 ? "opportunity" : "opportunities"} reviewed`,
          tone: "neutral",
        });
      }
      break;
    }
    case "strategy_finance": {
      const plans = (detail.plans as unknown[] | undefined) ?? [];
      if (plans.length > 0) {
        artifacts.push({ id: "mon-plan", label: "Monetization plan ready", tone: "success" });
      }
      break;
    }
    case "company_operations": {
      const blueprints = (detail.blueprints as unknown[] | undefined) ?? [];
      if (blueprints.length > 0) {
        artifacts.push({ id: "blueprint", label: "Blueprint ready", tone: "success" });
      }
      break;
    }
    case "creative_studio": {
      const assets = (detail.assets as unknown[] | undefined) ?? [];
      if (assets.length > 0) {
        artifacts.push({
          id: "visuals",
          label: `${assets.length} visual${assets.length === 1 ? "" : "s"} generated`,
          tone: "success",
        });
      }
      break;
    }
    case "product_lab": {
      const arts = (detail.productionArtifacts as unknown[] | undefined) ?? [];
      const changes = (detail.changeSets as unknown[] | undefined) ?? [];
      if (arts.length > 0) {
        artifacts.push({
          id: "artifact",
          label: `${arts.length} production artifact${arts.length === 1 ? "" : "s"}`,
          tone: department.state === "RUNNING" ? "pending" : "success",
        });
      }
      if (changes.length > 0) {
        artifacts.push({
          id: "changes",
          label: `${changes.length} change set${changes.length === 1 ? "" : "s"} applied`,
          tone: "neutral",
        });
      }
      break;
    }
    case "quality_control": {
      const reviews = (detail.reviews as unknown[] | undefined) ?? [];
      if (reviews.length > 0) {
        artifacts.push({ id: "qc", label: "Quality pass", tone: "success" });
      }
      break;
    }
    case "launch_operations": {
      const actions = (detail.externalActions as unknown[] | undefined) ?? [];
      const blocked = actions.some((a) => {
        const row = a as Record<string, unknown>;
        const status = String(row.execution_status ?? row.status ?? "").toLowerCase();
        return status.includes("block") || status.includes("fail");
      });
      if (blocked) {
        artifacts.push({ id: "launch-block", label: "Launch blocked", tone: "warning" });
      } else if (actions.length > 0) {
        artifacts.push({ id: "launch", label: "Launch action recorded", tone: "neutral" });
      }
      break;
    }
    case "executive_office": {
      if (department.summary) {
        artifacts.push({ id: "decision", label: "Decision ready", tone: "success" });
      }
      break;
    }
    default:
      break;
  }

  if (department.state === "BLOCKED") {
    artifacts.push({ id: "blocked", label: "Work blocked", tone: "warning" });
  }
  if (department.state === "FAILED") {
    artifacts.push({ id: "failed", label: "Work failed", tone: "warning" });
  }

  return artifacts.slice(0, 3);
}
