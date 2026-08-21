import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { transcribeHqCopilotAudio } from "@/lib/infinity/hq-copilot/voice";

export const dynamic = "force-dynamic";

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!audio || typeof audio === "string" || typeof audio.arrayBuffer !== "function") {
    return NextResponse.json({ error: "audio is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const mimeType = audio.type || (typeof form.get("mimeType") === "string" ? String(form.get("mimeType")) : "");
  const durationMs = form.get("durationMs");

  const transcribed = await transcribeHqCopilotAudio({
    audio: buffer,
    mimeType,
    filename: "name" in audio && typeof audio.name === "string" ? audio.name : "hq-copilot-voice.webm",
    durationMs,
  });

  if (!transcribed.ok) {
    return NextResponse.json({ error: transcribed.message, code: transcribed.code }, { status: transcribed.status });
  }

  return NextResponse.json(
    {
      transcript: transcribed.result.transcript,
      provider: transcribed.result.provider,
      model: transcribed.result.model,
      latencyMs: transcribed.result.latencyMs,
      cost: transcribed.result.costUsd,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
