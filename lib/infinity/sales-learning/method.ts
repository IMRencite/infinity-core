import {
  INFINITY_SALES_IDENTITY,
  INFINITY_SALES_METHOD_ID,
  INFINITY_SALES_METHOD_VERSION,
  INFINITY_SALES_PROCESS,
  type ObjectionClass,
} from "./contract";
import type { VentureSalesKnowledge } from "./types";

export const INFINITY_SALES_METHOD = {
  id: INFINITY_SALES_METHOD_ID,
  version: INFINITY_SALES_METHOD_VERSION,
  identity: INFINITY_SALES_IDENTITY,
  process: [...INFINITY_SALES_PROCESS],
  principles: [
    "Lead with curiosity and specific questions before any offer.",
    "Help the prospect name the problem and its business consequence themselves.",
    "Qualify fit, authority, and next-step capacity before asking for commitment.",
    "Keep activity disciplined: every interaction has a clear ask and a scheduled follow-up.",
    "Handle objections by listening, clarifying, and isolating one issue at a time.",
    "Build certainty with approved proof, not pressure, fake urgency, or invented scarcity.",
    "Stay in a structured conversation: open, discover, qualify, align, decide, learn.",
    "Identify as IMR's autonomous venture operating system whenever identity is relevant.",
    "Suppression, opt-out, and eligibility always override coaching or close guidance.",
  ],
  forbidden: [
    "deception",
    "false urgency",
    "fake scarcity",
    "unsupported claims",
    "harassment",
    "ignoring opt-outs",
    "misrepresentation",
    "impersonating a human salesperson",
    "copying proprietary third-party scripts",
  ],
} as const;

export const OBJECTION_HANDLING_LOOP = [
  { step: "LISTEN", intent: "Let the full objection land without interruption." },
  { step: "CLARIFY", intent: "Restate the concern and ask what it means in their situation." },
  { step: "ISOLATE", intent: "Confirm whether this is the only remaining issue." },
  { step: "UNDERSTAND", intent: "Find the business reason underneath the words." },
  { step: "RESPOND", intent: "Answer with approved facts and next-step options." },
  { step: "CONFIRM", intent: "Check whether the concern is resolved." },
  { step: "RETURN_TO_DECISION", intent: "Return to a clear yes, no, or scheduled next step." },
] as const;

export function classifyObjection(text: string): ObjectionClass {
  const value = text.toLowerCase();
  if (/price|cost|expensive|budget|discount/.test(value)) return "PRICE";
  if (/later|timing|not now|next quarter|busy/.test(value)) return "TIMING";
  if (/trust|proof|who are you|skeptic/.test(value)) return "TRUST";
  if (/don't need|no need|not a problem/.test(value)) return "NEED";
  if (/boss|partner|committee|not my decision/.test(value)) return "AUTHORITY";
  if (/competitor|other tool|already looking/.test(value)) return "COMPETITOR";
  if (/current provider|already have|incumbent/.test(value)) return "CURRENT_PROVIDER";
  if (/implement|setup|integration|too hard/.test(value)) return "IMPLEMENTATION";
  if (/risk|worried|what if/.test(value)) return "RISK";
  if (/roi|return|payback/.test(value)) return "ROI";
  if (/not interested|no thanks/.test(value)) return "NOT_INTERESTED";
  if (/send (me )?(info|information|deck)/.test(value)) return "SEND_INFORMATION";
  if (/think about|need to think/.test(value)) return "NEED_TO_THINK";
  if (/approval|legal|procurement/.test(value)) return "INTERNAL_APPROVAL";
  return "OTHER";
}

export function defaultOccupancyNpvKnowledge(): VentureSalesKnowledge {
  return {
    venture_id: "occupancynpv",
    version: "Venture Sales Pack v1",
    offers: ["OccupancyNPV commercial occupancy analysis for tenant-rep brokers"],
    icp: ["tenant-rep brokers", "commercial real-estate operators", "owners reviewing occupancy decisions"],
    qualification_criteria: ["has an active occupancy decision", "can schedule a working session", "not a residential-only shop"],
    differentiators: ["shared Infinity prospect graph", "decision-grade occupancy math", "no fabricated pipeline value"],
    proof: ["live OccupancyNPV product surface", "internal operating evidence"],
    pricing_rules: ["do not invent discounts", "do not quote unpublished prices"],
    approved_claims: [
      "IMR's autonomous venture operating system can operate OccupancyNPV continuously.",
      "OccupancyNPV helps operators quantify occupancy decisions.",
    ],
    objections: [
      { class: "PRICE", approach: "Clarify what they are comparing, isolate whether price is the only issue, then use approved value facts." },
      { class: "SEND_INFORMATION", approach: "Confirm the decision they are trying to make, then offer a bounded next step instead of a dump." },
      { class: "NOT_INTERESTED", approach: "Clarify whether the problem is absent or the timing is wrong. Do not argue." },
    ],
    disqualifiers: ["residential only", "no occupancy decision", "opted out"],
    next_steps: ["qualify the occupancy decision", "book a working review", "send only approved product context"],
    compliance_rules: [
      "identity must remain IMR's autonomous venture operating system",
      "suppression and STOP override all coaching",
      "live send requires Production Outbound Authorization; AUTONOMOUS stays gated",
    ],
  };
}

export function defaultFollowUpPacingHours(stage: string, urgency: "LOW" | "MEDIUM" | "HIGH"): number {
  if (urgency === "HIGH") return 24;
  if (stage === "CLOSE" || stage === "OBJECTION") return 48;
  if (stage === "FOLLOW_UP") return 72;
  return 96;
}
