import { NextResponse } from "next/server";
import { ALL_HQ_ROOM_IDS } from "@/lib/infinity/operator-console/room-naming";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { answerHqCopilotQuery, createHqCopilotReadRuntime } from "@/lib/infinity/hq-copilot";
import { MAX_COPILOT_QUESTION_CHARS, type HqCopilotConversationTurn } from "@/lib/infinity/hq-copilot/types";

export const dynamic = "force-dynamic";

function isDepartmentId(value: unknown): value is DepartmentId {
  return typeof value === "string" && (ALL_HQ_ROOM_IDS as string[]).includes(value);
}

function parseConversation(value: unknown): HqCopilotConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((turn): turn is HqCopilotConversationTurn => {
      if (!turn || typeof turn !== "object") return false;
      const role = (turn as { role?: unknown }).role;
      const text = (turn as { text?: unknown }).text;
      return (role === "user" || role === "assistant") && typeof text === "string";
    })
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_COPILOT_QUESTION_CHARS) }));
}

function resolveOperatorAuth(result: unknown): { userId: string; organizationId: string } | null {
  if (!result || typeof result !== "object") return null;
  if ("status" in result) {
    const typed = result as { status?: string; context?: { userId?: string; organizationId?: string } };
    if (typed.status !== "ok") return null;
    if (!typed.context?.userId || !typed.context.organizationId) return null;
    return { userId: typed.context.userId, organizationId: typed.context.organizationId };
  }
  const typed = result as { userId?: string; organizationId?: string };
  if (!typed.userId || !typed.organizationId) return null;
  return { userId: typed.userId, organizationId: typed.organizationId };
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = resolveOperatorAuth(await getOperatorOrgContext());
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const currentRoom = isDepartmentId(body.currentRoom) ? body.currentRoom : null;

  try {
    const response = await answerHqCopilotQuery({
      query: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        question,
        currentRoute: typeof body.currentRoute === "string" ? body.currentRoute : null,
        currentVentureId: typeof body.currentVentureId === "string" ? body.currentVentureId : null,
        currentRoom,
        selectedArtifactId: typeof body.selectedArtifactId === "string" ? body.selectedArtifactId : null,
        conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
        conversation: parseConversation(body.conversation),
      },
      runtime: createHqCopilotReadRuntime(),
    });

    return NextResponse.json(
      {
        answer: response.answer,
        intent: response.intent,
        sources: response.sources.map(({ type, label, href }) => ({ type, label, href })),
        groundingStatus: response.groundingStatus,
        navigation: response.navigation ?? null,
        blockedAction: response.blockedAction ?? null,
        latencyMs: response.latencyMs,
        provider: response.provider,
        model: response.model,
        costUsd: response.costUsd,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "HQ Copilot query failed" }, { status: 500 });
  }
}
