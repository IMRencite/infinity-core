import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createChunks, stringToBase64URL } from "@supabase/ssr";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

async function founderCookieHeader(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !service || !anonKey) return null;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const listed = await admin.auth.admin.listUsers({ perPage: 5 });
  const email = listed.data.users.find((row) => row.email)?.email ?? null;
  if (!email) return null;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token = link.data.properties?.hashed_token;
  if (!token) return null;
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await anon.auth.verifyOtp({ token_hash: token, type: "email" });
  const session = verified.data.session;
  if (!session?.access_token) return null;
  const ref = new URL(url).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  return createChunks(key, encoded).map((chunk) => `${chunk.name}=${chunk.value}`).join("; ");
}

async function main() {
  const dashboard = await fetch("https://hq.imros.io/dashboard", { redirect: "manual", cache: "no-store" });
  const cookie = await founderCookieHeader();
  const live = await fetch("https://hq.imros.io/api/operator-console/hq-live-state", {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });
  const body = await live.json().catch(() => ({}));
  const command = body.commandActivity ?? body.nowInspecting ?? body.view?.nowInspecting ?? {};
  const scheduler = body.communicationScheduler ?? {};
  const sales = body.salesCommandCenter ?? {};
  const conversation = Array.isArray(sales.conversations) ? sales.conversations[0] ?? {} : {};
  console.log(JSON.stringify({
    origin: "https://hq.imros.io",
    dashboard_status: dashboard.status,
    dashboard_location: dashboard.headers.get("location"),
    live_status: live.status,
    current_work: command.status ?? command.currentMission ?? null,
    current_mission: command.currentMission ?? null,
    current_task: command.currentTask ?? null,
    scheduler_status: scheduler.status ?? null,
    last_tick_at: scheduler.last_tick_at ?? null,
    last_gmail_check_at: scheduler.last_gmail_check_at ?? null,
    waiting_jobs: scheduler.waiting_jobs ?? null,
    ready_jobs: scheduler.ready_jobs ?? null,
    failed_jobs: scheduler.failed_jobs ?? null,
    sales_stage: conversation.stage ?? null,
    next_best_action: conversation.next_best_action ?? null,
    last_conversation_activity: conversation.last_interaction ?? null,
    keys: Object.keys(body).slice(0, 20),
  }, null, 2));
}

void main();
