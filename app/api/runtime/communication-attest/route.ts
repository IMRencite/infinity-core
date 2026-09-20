import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyHumanAttestationExpiry, evaluateAttestationPathGate } from "@/lib/infinity/production-outbound/obligation/human-attestation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCOPE = "communication-human-attestation-v7";

function authorizeFounderAttestation(request: Request): { ok: boolean; reason: string } {
  const expected = process.env.FOUNDER_ATTESTATION_TOKEN || process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
  if (!expected) return { ok: false, reason: "FOUNDER_ATTESTATION_SECRET_REQUIRED" };
  const header = request.headers.get("authorization");
  if (header === `Bearer ${expected}`) return { ok: true, reason: "AUTHORIZED" };
  return { ok: false, reason: "UNAUTHORIZED" };
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    gate: evaluateAttestationPathGate({
      endpoint_exists: true,
      rejects_unauthenticated: true,
      ordinary_prompt_accepted: false,
    }),
    ordinary_prompt_accepted: false,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = authorizeFounderAttestation(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, ordinary_prompt_accepted: false }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as {
    request_id?: string;
    attested_by?: string;
    answers?: Record<string, string>;
  } | null;
  if (!body?.request_id || body.attested_by !== "FOUNDER" || !body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "INVALID_ATTESTATION_PAYLOAD", ordinary_prompt_accepted: false }, { status: 400 });
  }
  if (body.request_id === "har:mailbox-role-and-test-authorship:v7") {
    const role = body.answers.mailbox_role;
    const authored = body.answers.authored_target;
    if (!role || !["TEST", "PRODUCTION", "BOTH", "UNKNOWN"].includes(role) || !authored || !["YES", "NO"].includes(authored)) {
      return NextResponse.json({ error: "MAILBOX_ANSWERS_REQUIRED", allowed: { mailbox_role: ["TEST", "PRODUCTION", "BOTH", "UNKNOWN"], authored_target: ["YES", "NO"] } }, { status: 400 });
    }
  }
  if (body.request_id === "har:offer-truth:occupancynpv-offer-truth-v1") {
    if (body.answers.approved !== "YES" && body.answers.approved !== "NO") {
      return NextResponse.json({ error: "OFFER_ANSWER_REQUIRED", allowed: { approved: ["YES", "NO"] } }, { status: 400 });
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "SUPABASE_UNAVAILABLE" }, { status: 503 });
  const now = new Date().toISOString();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const existing = await client.from("cloud_runtime_state").select("payload").eq("scope", SCOPE).maybeSingle();
  const requests = ((existing.data?.payload as { requests?: Array<Record<string, unknown>> } | undefined)?.requests ?? []).map((row) => {
    const current = applyHumanAttestationExpiry(row as never, now);
    if (current.id !== body.request_id) return current;
    return {
      ...current,
      status: body.request_id.includes("offer") && body.answers?.approved === "NO" ? "REJECTED" : "ATTESTED",
      attested_by: "FOUNDER",
      attested_at: now,
      answers: body.answers,
      next_action: "NONE",
      updated_at: now,
    };
  });
  await client.from("cloud_runtime_state").upsert({
    scope: SCOPE,
    version: 1,
    instance_id: "communication-human-attestation",
    payload: { requests },
    updated_at: now,
  });
  return NextResponse.json({ ok: true, request_id: body.request_id, status: requests.find((row) => row.id === body.request_id)?.status ?? "ATTESTED" });
}
