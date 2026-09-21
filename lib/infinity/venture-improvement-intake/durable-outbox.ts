import { createClient } from "@supabase/supabase-js";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { submitVentureImprovementIntake } from "./submit";
import { INTAKE_SOURCES, type IntakeSource } from "./types";

export const OCCUPANCYNPV_IMPROVEMENT_INTAKE_BUCKET = "occupancynpv-improvement-intake" as const;
export const OCCUPANCYNPV_IMPROVEMENT_INTAKE_PENDING_PREFIX = "pending/" as const;

export type OccupancynpvImprovementIntakeOutboxPayload = {
  venture_id: string;
  submission_id: string;
  source: string;
  message: string;
  goal_or_context?: string | null;
  page_url_or_route?: string | null;
  workflow_context?: string | null;
  contact_email?: string | null;
  product_area?: string | null;
  synthetic?: boolean;
  created_at?: string;
};

function asSource(value: unknown): IntakeSource {
  return INTAKE_SOURCES.includes(value as IntakeSource) ? value as IntakeSource : "PUBLIC_SITE_FEEDBACK";
}

function outboxEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_PRODUCT_IMPROVEMENT_PERSIST !== "1") return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function hydrateCanonicalImprovementIntakeFromOutbox(): Promise<{
  hydrated: number;
  reason: string;
}> {
  if (!outboxEnabled()) return { hydrated: 0, reason: "OUTBOX_DISABLED" };
  const admin = adminClient();
  if (!admin) return { hydrated: 0, reason: "SUPABASE_UNAVAILABLE" };
  const listed = await admin.storage.from(OCCUPANCYNPV_IMPROVEMENT_INTAKE_BUCKET).list("pending", { limit: 100 });
  if (listed.error) return { hydrated: 0, reason: "OUTBOX_LIST_FAILED" };
  let hydrated = 0;
  for (const file of listed.data ?? []) {
    if (!file.name.endsWith(".json")) continue;
    const path = `${OCCUPANCYNPV_IMPROVEMENT_INTAKE_PENDING_PREFIX}${file.name}`;
    const downloaded = await admin.storage.from(OCCUPANCYNPV_IMPROVEMENT_INTAKE_BUCKET).download(path);
    if (downloaded.error || !downloaded.data) continue;
    const raw = await downloaded.data.text();
    let payload: OccupancynpvImprovementIntakeOutboxPayload;
    try {
      payload = JSON.parse(raw) as OccupancynpvImprovementIntakeOutboxPayload;
    } catch {
      continue;
    }
    const result = submitVentureImprovementIntake({
      venture_id: payload.venture_id || CRE_VENTURE_ID,
      submission_id: payload.submission_id,
      source: asSource(payload.source),
      message: payload.message ?? "",
      goal_or_context: payload.goal_or_context ?? null,
      page_url_or_route: payload.page_url_or_route ?? null,
      workflow_context: payload.workflow_context ?? null,
      product_area: payload.product_area ?? "OccupancyNPV",
      contact_email: payload.contact_email ?? null,
      synthetic: payload.synthetic === true,
      received_at: payload.created_at,
      client_key: "occupancynpv-outbox",
      byte_length: new TextEncoder().encode(raw).length,
    });
    if (!result.ok && result.reason !== "DUPLICATE" && !result.reason.startsWith("DUPLICATE")) continue;
    await admin.storage.from(OCCUPANCYNPV_IMPROVEMENT_INTAKE_BUCKET).upload(`ingested/${file.name}`, raw, {
      contentType: "application/json",
      upsert: true,
    });
    await admin.storage.from(OCCUPANCYNPV_IMPROVEMENT_INTAKE_BUCKET).remove([path]);
    hydrated += 1;
  }
  return { hydrated, reason: hydrated > 0 ? "HYDRATED" : "EMPTY" };
}
