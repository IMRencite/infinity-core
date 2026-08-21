import { getRoomDisplayNames } from "@/lib/infinity/operator-console/room-naming";
import { blockedActionAnswer } from "./capabilities";
import type { HqCopilotContextPackage } from "./context-builder";
import { mentionsUnrecordedMetric } from "./grounding";
import { resolveHqCopilotNavigation } from "./navigation";
import { sanitizeCopilotAnswer } from "./sanitize";
import type { HqCopilotQuery, HqCopilotResponse } from "./types";
import { HQ_COPILOT_SYSTEM_INSTRUCTION, INSUFFICIENT_EVIDENCE_ANSWER } from "./types";
import type { HqCopilotRouteResult } from "./query-router";

export { HQ_COPILOT_SYSTEM_INSTRUCTION };

function insufficient(): Pick<HqCopilotResponse, "answer" | "groundingStatus" | "sources"> {
  return { answer: INSUFFICIENT_EVIDENCE_ANSWER, groundingStatus: "INSUFFICIENT_EVIDENCE", sources: [] };
}

export function composeGroundedHqCopilotAnswer(input: {
  query: HqCopilotQuery;
  route: HqCopilotRouteResult;
  context: HqCopilotContextPackage | null;
}): Pick<HqCopilotResponse, "answer" | "groundingStatus" | "sources" | "navigation" | "blockedAction"> {
  const { query, route, context } = input;

  if (route.intent === "FORBIDDEN_ACTION") {
    return {
      answer: blockedActionAnswer(route.blockedAction),
      groundingStatus: "BLOCKED",
      sources: [],
      blockedAction: route.blockedAction,
    };
  }

  if (route.intent === "NAVIGATION_REQUEST") {
    const navigation = resolveHqCopilotNavigation(query.question, {
      currentVentureId: query.currentVentureId,
    });
    if (!navigation) {
      return {
        answer: "I can only open allowlisted Infinity HQ views.",
        groundingStatus: "INSUFFICIENT_EVIDENCE",
        sources: [],
      };
    }
    return {
      answer: `Opening ${navigation.label}. This changes the HQ view only and does not mutate business state.`,
      groundingStatus: "NAVIGATION_ONLY",
      sources: [],
      navigation,
    };
  }

  if (!context) return insufficient();
  if (mentionsUnrecordedMetric(query.question, context)) {
    return { ...insufficient(), sources: context.sources.slice(0, 3) };
  }
  if (context.scopeNote && !context.currentVenture && route.intent !== "PORTFOLIO_STATUS" && route.intent !== "PROVIDER_STATUS" && route.intent !== "PERFORMANCE_STATUS") {
    return {
      answer: `${context.scopeNote} Ask from a venture view, or name a recorded venture.`,
      groundingStatus: "INSUFFICIENT_EVIDENCE",
      sources: context.sources,
    };
  }

  const facts = context.facts;
  const sources = context.sources;
  const ventureName = context.currentVenture?.venture.ventureName ?? "the current venture";

  switch (route.intent) {
    case "PORTFOLIO_STATUS": {
      const active = context.portfolio?.ventures.filter((v) => v.isActive && !v.excludedFromPortfolio) ?? [];
      if (!context.portfolio) return insufficient();
      return {
        answer: active.length
          ? `Recorded active ventures: ${active.map((v) => v.ventureName).join(", ")}.`
          : "Infinity currently has no recorded active ventures.",
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "VENTURE_BLOCKERS": {
      if (!context.currentVenture) return insufficient();
      const blocked = context.currentVenture.departments.filter((d) => d.state === "BLOCKED" || d.state === "FAILED");
      return {
        answer: blocked.length
          ? `${ventureName} is blocked in ${blocked
              .map((d) => `${getRoomDisplayNames(d.id).displayName} (${d.state}${d.summary ? `: ${d.summary}` : ""})`)
              .join("; ")}.`
          : `No blocking or failed rooms are currently recorded for ${ventureName}.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "ROOM_ACTIVITY":
    case "ROOM_STATUS":
    case "VALIDATION_STATUS": {
      const roomFact = facts.find((f) => /Validation Station|is (COMPLETE|RUNNING|WAITING|BLOCKED|FAILED|SKIPPED|NOT_STARTED|UNKNOWN|PAUSED)/.test(f) && (route.roomId ? f.includes(getRoomDisplayNames(route.roomId ?? "quality_control").displayName) || true : true));
      const roomName = route.roomId ? getRoomDisplayNames(route.roomId).displayName : query.currentRoom ? getRoomDisplayNames(query.currentRoom).displayName : "this room";
      const activity = facts.find((f) => f.startsWith(roomName) || f.includes(`${roomName} is`));
      if (!activity && !roomFact) {
        return {
          answer: query.currentRoom || route.roomId
            ? `${roomName} has no recorded current-venture context to describe.`
            : "No room is currently selected. Open a room or name it.",
          groundingStatus: "INSUFFICIENT_EVIDENCE",
          sources,
        };
      }
      return {
        answer: activity ?? roomFact ?? `${roomName} has recorded state in HQ, but no extra activity sentence is available.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "PROVIDER_STATUS": {
      const providerFacts = facts.filter((f) => /Cloudflare|Namecheap|Vercel|Stripe/.test(f));
      if (!providerFacts.length) return insufficient();
      const verified = providerFacts.filter((f) => f.includes("READ_ONLY_VERIFIED"));
      return {
        answer: `Recorded provider readiness: ${providerFacts.join(" ")} Verified in this snapshot: ${verified.length ? verified.map((f) => f.split(" ")[0]).join(", ") : "none"}.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "TREASURY_STATUS": {
      const allocation = facts.find((f) => f.startsWith("Recorded allocation"));
      const treasury = facts.find((f) => f.startsWith("Treasury available"));
      if (allocation) return { answer: allocation, groundingStatus: "GROUNDED", sources };
      if (treasury && !context.currentVenture) return { answer: treasury, groundingStatus: "GROUNDED", sources };
      if (facts.some((f) => f.includes("No Treasury allocation row"))) {
        return {
          answer: "Infinity does not currently have a recorded Treasury allocation for this venture.",
          groundingStatus: "INSUFFICIENT_EVIDENCE",
          sources,
        };
      }
      return treasury ? { answer: treasury, groundingStatus: "GROUNDED", sources } : insufficient();
    }
    case "EXISTING_DECISION_EXPLANATION": {
      const decision = facts.find((f) => f.startsWith("Existing recorded decision"));
      if (!decision) {
        return {
          answer: "Infinity does not currently have a recorded decision to explain for this venture.",
          groundingStatus: "INSUFFICIENT_EVIDENCE",
          sources,
        };
      }
      return {
        answer: `${decision} This is an explanation of an existing recorded decision, not a new HOLD/BUILD/REJECT decision.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "RESEARCH_EVIDENCE":
    case "TRACE_LINEAGE": {
      const research = facts.find((f) => f.startsWith("Research Grid"));
      const lineage = facts.find((f) => f.startsWith("Recorded lineage"));
      if (!research && !lineage) return insufficient();
      return {
        answer: [research, lineage].filter(Boolean).join(" "),
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "BUILD_STATUS":
    case "ARTIFACT_STATUS": {
      const build = facts.find((f) => f.startsWith("Creation Lab"));
      if (!build) return insufficient();
      return { answer: build, groundingStatus: "GROUNDED", sources };
    }
    case "PERFORMANCE_STATUS": {
      const top = facts.find((f) => f.startsWith("Recorded top performer"));
      if (!top) return insufficient();
      return {
        answer: `${top} This reports recorded metrics only and is not a funding or kill recommendation.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "COMPARE_EXISTING_METRICS": {
      const rows = facts.filter((f) => f.includes("recorded revenue"));
      if (rows.length < 2) return insufficient();
      return {
        answer: `${rows.join(" ")} This is a comparison of recorded metrics, not a recommendation to fund or prioritize either venture.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "VENTURE_READINESS": {
      if (context.currentVenture) {
        return {
          answer: `${ventureName} readiness is ${context.currentVenture.venture.readinessStatus ?? "UNKNOWN"} with overall status ${context.currentVenture.overallStatus}. This is a status report, not a launch authorization.`,
          groundingStatus: "GROUNDED",
          sources,
        };
      }
      const active = context.portfolio?.ventures.filter((v) => v.isActive && !v.excludedFromPortfolio) ?? [];
      if (!active.length) return insufficient();
      return {
        answer: `Ventures with recorded active status: ${active.map((v) => `${v.ventureName} (${v.status})`).join(", ")}. This is recorded status, not a launch ranking decision.`,
        groundingStatus: "GROUNDED",
        sources,
      };
    }
    case "VENTURE_STATUS":
    case "MISSION_STATUS":
    case "MONETIZATION_STATUS":
    case "GENERAL_HQ_SUMMARY": {
      const summary = facts.slice(0, 6).join(" ");
      if (!summary) return insufficient();
      return { answer: summary, groundingStatus: "GROUNDED", sources };
    }
    default:
      return insufficient();
  }
}

export function finalizeHqCopilotAnswer(
  composed: Pick<HqCopilotResponse, "answer" | "groundingStatus" | "sources" | "navigation" | "blockedAction">,
  question: string,
): Pick<HqCopilotResponse, "answer" | "groundingStatus" | "sources" | "navigation" | "blockedAction"> {
  return {
    ...composed,
    answer: sanitizeCopilotAnswer(composed.answer, question),
  };
}
