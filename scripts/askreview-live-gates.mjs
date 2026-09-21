import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
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

const verify = JSON.parse(readFileSync(".infinity/askreview/production-verify.json", "utf8"));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const probe = await admin.from("askreview_customers").select("customer_id").limit(1);
const occupancy = await admin.from("occupancynpv_customers").select("customer_id").limit(1);

const productionReadWriteVerified = verify.location?.ok && verify.kit?.ok && !probe.error;
const backendReasons = [];
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) backendReasons.push("PRODUCTION_PROVIDER_UNBOUND");
if (probe.error) backendReasons.push("DATABASE_OR_STORAGE_UNREACHABLE");
if (!productionReadWriteVerified) backendReasons.push("PRODUCTION_READ_WRITE_NOT_VERIFIED");
if (verify.isolation?.rlsRead !== "BLOCKED") backendReasons.push("TENANT_ISOLATION_NOT_VERIFIED");

const report = {
  VentureBackendReadinessGate: backendReasons.length === 0 ? "PASS" : "FAIL",
  reasons: backendReasons,
  productionProvider: "Supabase",
  productionPersistence: productionReadWriteVerified ? "PASS" : "FAIL",
  FulfillmentReadinessGate: verify.kit?.ok && verify.kit?.qrEquivalence ? "PASS" : "FAIL",
  occupancyNpvStillReadable: !occupancy.error,
  jsonProductionFallback: "DISABLED",
};

mkdirSync(".infinity/askreview", { recursive: true });
writeFileSync(".infinity/askreview/live-gates.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
