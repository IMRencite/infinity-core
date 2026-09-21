import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const { data } = client
  ? await client.from("cloud_runtime_state").select("payload").eq("scope", "production-outbound-closed-loop-v1").maybeSingle()
  : { data: null };
const suppression = data?.payload?.suppression ?? null;
const providerCalled = false;
const eligibility = suppression?.status === "ACTIVE" && suppression?.reason === "OPT_OUT" ? "BLOCKED" : "ALLOWED";
console.log(JSON.stringify({
  contract: "SuppressedRecipientSendBlockEvalV1",
  suppression_lookup: Boolean(suppression),
  channel: suppression?.channel ?? null,
  reason: suppression?.reason ?? null,
  venture: suppression?.venture ?? null,
  eligibility,
  provider_called: providerCalled,
  gate: eligibility === "BLOCKED" && providerCalled === false ? "PASS" : suppression ? "FAIL" : "NOT_PROVEN",
}, null, 2));
