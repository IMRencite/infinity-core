import { loadEnvLocal } from "../lib/infinity/market-validation-experiment/live";
import { LIVE_ORG } from "../lib/infinity/market-validation-experiment/constants";
import { createAdminClient } from "../lib/supabase/admin";

loadEnvLocal();

const publicUrl = "https://infinity-validation-cre-lease-npv-e72beb7b-1v8yc763e.vercel.app";
const pageRes = await fetch(publicUrl, { redirect: "manual" });
const html = await pageRes.text();
const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
const looksLikeVercelError = /This Deployment has failed|Command .+ exited|Type error/i.test(html);
const hasCandidate = html.includes("data-candidate-id");
const hasQuestion = html.includes("data-question-id");

const admin = createAdminClient();
const { data, error } = await admin
  .from("engine_events")
  .select("event_type,message,created_at,payload")
  .eq("organization_id", LIVE_ORG)
  .eq("engine_name", "mission_activity")
  .or("message.ilike.%final CRE%,message.ilike.%final repair%,entity_id.ilike.%final_repair%")
  .order("created_at", { ascending: false })
  .limit(20);

process.stdout.write(
  `${JSON.stringify(
    {
      mutated: false,
      publicUrlStatus: pageRes.status,
      title,
      looksLikeVercelError,
      hasCandidate,
      hasQuestion,
      htmlLen: html.length,
      queryError: error?.message ?? null,
      relatedEvents: (data ?? []).map((row) => ({
        event_type: row.event_type,
        message: row.message,
        created_at: row.created_at,
        missionId: (row.payload as { missionId?: string } | null)?.missionId ?? null,
      })),
    },
    null,
    2,
  )}\n`,
);
