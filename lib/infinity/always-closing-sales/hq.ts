import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { getClosedLoopDurableState } from "@/lib/infinity/production-outbound/closed-loop-durable";
import { getCommunicationSchedulerState, projectCommunicationSchedulerHq } from "@/lib/infinity/production-outbound/communication-runtime";
import { rankSalesPriorityQueue, selectNextBestCommercialAction, type ConversationMomentumState } from "./doctrine";

export type SalesCommandCenterView = {
  pipeline: Record<string, number>;
  conversations: Array<{
    venture: string;
    stage: string;
    last_interaction: string | null;
    latest_intent: string | null;
    pain: string | null;
    next_best_action: string;
    source: string;
  }>;
  priority: Array<{ conversation_id: string; score: number; reason: string }>;
};

export function projectSalesCommandCenterView(): SalesCommandCenterView {
  const conversation = getClosedLoopDurableState().conversation;
  const inbound = conversation?.reply_classification ?? conversation?.intent ?? "";
  const suppressed = /OPT_OUT/i.test(conversation?.conversation_state ?? "")
    || getClosedLoopDurableState().suppression?.status === "ACTIVE";
  const decision = selectNextBestCommercialAction({
    inbound: inbound || " OccupancyNPV comparison",
    intent: conversation?.intent,
    turn: 3,
    suppressed,
  });
  const pipeline = {
    New: 0,
    Engaged: conversation && !/OPT_OUT/i.test(conversation.conversation_state ?? "") ? 1 : 0,
    Qualified: /REQUEST_EXAMPLE|RENEW_VS|POSITIVE/i.test(conversation?.intent ?? "") ? 1 : 0,
    HighIntent: 0,
    Trials: 0,
    Demos: 0,
    Proposals: 0,
    Won: 0,
    Lost: 0,
    Dormant: 0,
    Suppressed: /OPT_OUT/i.test(conversation?.conversation_state ?? "") ? 1 : 0,
  };
  const conversations = conversation
    ? [{
      venture: "OccupancyNPV",
      stage: /ENGAGED|QUALIFIED|HIGH_INTENT|ACTIVE/i.test(conversation.conversation_state ?? "")
        ? conversation.conversation_state
        : decision.momentum,
      last_interaction: conversation.last_activity_at,
      latest_intent: conversation.intent ?? conversation.reply_classification,
      pain: decision.pain,
      next_best_action: suppressed
        ? "SUPPRESS"
        : /REQUEST_NUMBERS|INVITE_TRIAL|INVITE_DEMO|BUILD_SCENARIO|SHOW_PROOF|HANDLE_OBJECTION/i.test(conversation.next_action ?? "")
        ? conversation.next_action!
        : decision.next_action,
      source: "gmail-canary",
    }]
    : [];
  return {
    pipeline,
    conversations,
    priority: rankSalesPriorityQueue([{
      conversation_id: conversation?.id ?? "none",
      intent: conversation?.intent,
      recency_hours: 1,
      suppressed: /OPT_OUT/i.test(conversation?.conversation_state ?? ""),
      momentum: decision.momentum as ConversationMomentumState,
    }]),
  };
}

export function overlayLiveCommercialWork(view: CommandActivityView): CommandActivityView {
  const scheduler = projectCommunicationSchedulerHq();
  const conversation = getClosedLoopDurableState().conversation;
  const tick = getCommunicationSchedulerState();
  const productionLive = Boolean(scheduler.last_tick_at) && scheduler.distinction !== "SCHEDULER_NOT_RUNNING";
  const salesLive = Boolean(conversation?.last_inbound_message_id);
  if (view.nowInspecting.status === "ACTIVE_WORK" && view.nowInspecting.currentMission && !/Infinity implementation work|current founder request/i.test(view.nowInspecting.currentMission)) {
    return view;
  }
  if (!productionLive && !salesLive) return view;
  const sales = projectSalesCommandCenterView();
  const task = conversation
    ? `OccupancyNPV ${conversation.intent ?? "conversation"} · next ${sales.conversations[0]?.next_best_action ?? "WAIT"} · Gmail ${scheduler.last_gmail_check_at ?? "unchecked"}`
    : `Communication scheduler ${scheduler.status} · last tick ${scheduler.last_tick_at}`;
  return {
    ...view,
    nowInspecting: {
      ...view.nowInspecting,
      currentWorkId: "work:occupancynpv:always-closing-sales",
      currentMission: "OccupancyNPV — Always-closing sales + inbound Gmail",
      currentPhase: "COMMERCIAL",
      currentStep: sales.conversations[0]?.next_best_action ?? "WATCH",
      currentRoom: "sales",
      currentRooms: ["sales", "operations"],
      currentWorker: "communication-runtime",
      currentTask: task,
      status: "ACTIVE_WORK",
      why: "Live production conversation and scheduler are more current than idle canonical work.",
      startedAt: tick.last_success_at ?? conversation?.last_activity_at ?? view.nowInspecting.startedAt,
      lastActivity: task,
      lastActivityAt: scheduler.last_tick_at ?? conversation?.last_activity_at ?? view.nowInspecting.lastActivityAt,
      nextExpectedStep: scheduler.next_tick_at,
      blocker: scheduler.last_error,
      authorizationRequired: null,
    },
    counts: {
      ...view.counts,
      activeMissions: Math.max(view.counts.activeMissions, 1),
    },
  };
}
