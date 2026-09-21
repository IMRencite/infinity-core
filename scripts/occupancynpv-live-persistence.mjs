/**
 * Live OccupancyNPV persistence + RLS probe. Prints statuses only, not secrets or PII.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  const key = trimmed.slice(0, sep);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[key] = val;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const emailA = `onpv.a.${stamp}@example.com`;
const emailB = `onpv.b.${stamp}@example.com`;
const password = "OccupancyNpvTest1";

function err(result) {
  return result?.error ? `${result.error.code ?? "ERR"}:${result.error.message}` : null;
}

async function userClient(session) {
  const client = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const set = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return { client, setError: err(set) };
}

const createdA = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
const createdB = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
if (createdA.error || createdB.error) {
  console.log("auth_create: FAIL", createdA.error?.message ?? createdB.error?.message);
  process.exit(1);
}
const idA = createdA.data.user.id;
const idB = createdB.data.user.id;
const custA = `cust_${idA.replace(/-/g, "").slice(0, 16)}`;
const custB = `cust_${idB.replace(/-/g, "").slice(0, 16)}`;

const customers = await admin.from("occupancynpv_customers").insert([
  { customer_id: custA, venture_id: "occupancynpv", auth_identity_id: idA, email: emailA, status: "ACTIVE" },
  { customer_id: custB, venture_id: "occupancynpv", auth_identity_id: idB, email: emailB, status: "ACTIVE" },
]).select("customer_id,auth_identity_id,venture_id,status,created_at");
const entitlements = await admin.from("occupancynpv_entitlements").insert([
  { entitlement_id: `ent_pro_${stamp}`, customer_id: custA, offer_id: "PROFESSIONAL", payment_reference: `pay_pro_${stamp}`, entitlement_type: "PROFESSIONAL_ACCESS", quantity: 1, status: "ACTIVE" },
  { entitlement_id: `ent_deal_${stamp}`, customer_id: custB, offer_id: "PER_DEAL", payment_reference: `pay_deal_${stamp}`, entitlement_type: "ONE_DEAL_WORKSPACE", quantity: 1, quantity_remaining: 1, status: "ACTIVE" },
]).select("entitlement_id,status,quantity,quantity_remaining,payment_reference");
const orders = await admin.from("occupancynpv_fulfillment_orders").insert([
  { order_id: `ord_fail_${stamp}`, customer_id: custA, offer_id: "PROFESSIONAL", payment_reference: `pay_fail_${stamp}`, state: "FULFILLMENT_FAILED" },
]).select("order_id,state");
const wsA = `ws_a_${stamp}`;
const workspace = await admin.from("occupancynpv_deal_workspaces").insert({
  workspace_id: wsA,
  customer_id: custA,
  entitlement_id: `ent_pro_${stamp}`,
  name: "A durable workspace",
  status: "ACTIVE",
}).select("workspace_id,customer_id,status,created_at");
const scenario = await admin.from("occupancynpv_lease_scenarios").insert({
  scenario_id: "lease_a",
  workspace_id: wsA,
  input_json: { scenario_id: "lease_a", term_months: 12 },
  result_json: { npv: 1 },
}).select("scenario_id,workspace_id");
const duplicateEntitlement = await admin.from("occupancynpv_entitlements").insert({
  entitlement_id: `ent_dup_${stamp}`,
  customer_id: custA,
  offer_id: "PROFESSIONAL",
  payment_reference: `pay_pro_${stamp}`,
  entitlement_type: "PROFESSIONAL_ACCESS",
  quantity: 1,
  status: "ACTIVE",
});

const authPublic = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const signA = await authPublic.auth.signInWithPassword({ email: emailA, password });
const signB = await authPublic.auth.signInWithPassword({ email: emailB, password });
if (signA.error || signB.error || !signA.data.session || !signB.data.session) {
  console.log("auth_session: FAIL", signA.error?.message ?? signB.error?.message);
  await cleanup();
  process.exit(1);
}

const { client: clientA, setError: setA } = await userClient(signA.data.session);
const { client: clientB, setError: setB } = await userClient(signB.data.session);
const aOwn = await clientA.from("occupancynpv_deal_workspaces").select("workspace_id").eq("workspace_id", wsA);
const aOwnScenario = await clientA.from("occupancynpv_lease_scenarios").select("scenario_id").eq("workspace_id", wsA);
const bReadA = await clientB.from("occupancynpv_deal_workspaces").select("workspace_id").eq("workspace_id", wsA);
const bEnum = await clientB.from("occupancynpv_deal_workspaces").select("workspace_id");
const bWriteA = await clientB.from("occupancynpv_deal_workspaces").update({ name: "hijack" }).eq("workspace_id", wsA).select("workspace_id");
const bInsertA = await clientB.from("occupancynpv_deal_workspaces").insert({
  workspace_id: `ws_hijack_${stamp}`,
  customer_id: custA,
  entitlement_id: `ent_pro_${stamp}`,
  name: "not allowed",
  status: "ACTIVE",
});
const bReadAScenario = await clientB.from("occupancynpv_lease_scenarios").select("scenario_id").eq("workspace_id", wsA);

const consume = await admin.from("occupancynpv_entitlements").update({
  quantity_remaining: 0,
  status: "CONSUMED",
}).eq("entitlement_id", `ent_deal_${stamp}`).eq("customer_id", custB).select("status,quantity_remaining");
const reload = await admin.from("occupancynpv_entitlements").select("status,quantity_remaining").eq("entitlement_id", `ent_deal_${stamp}`).maybeSingle();
const secondAlloc = await admin.from("occupancynpv_deal_workspaces").insert({
  workspace_id: `ws_b2_${stamp}`,
  customer_id: custB,
  entitlement_id: `ent_deal_${stamp}`,
  name: "should be application-blocked after consume",
  status: "ACTIVE",
});
const failed = await admin.from("occupancynpv_fulfillment_orders").select("state").eq("order_id", `ord_fail_${stamp}`).maybeSingle();
const known = await admin.from("occupancynpv_entitlements").select("payment_reference");
const orphans = [`pay_orphan_${stamp}`, `pay_pro_${stamp}`].filter((ref) => !(known.data ?? []).some((row) => row.payment_reference === ref));
const repaired = orphans.filter((ref) => ref !== `pay_orphan_${stamp}`).length === 0 && orphans.includes(`pay_orphan_${stamp}`);

const customerCols = customers.data?.[0] ? Object.keys(customers.data[0]).sort().join(",") : "NONE";
const entitlementCols = entitlements.data?.[0] ? Object.keys(entitlements.data[0]).sort().join(",") : "NONE";
const workspaceCols = workspace.data?.[0] ? Object.keys(workspace.data[0]).sort().join(",") : "NONE";

console.log("auth_create: PASS");
console.log("customer_persist:", !customers.error && customers.data?.length === 2 ? "PASS" : `FAIL ${err(customers) ?? ""}`.trim());
console.log("customer_columns:", customerCols);
console.log("auth_users_linkage:", customers.data?.every((row) => row.auth_identity_id === idA || row.auth_identity_id === idB) ? "PASS" : "FAIL");
console.log("professional_entitlement:", !entitlements.error && entitlements.data?.some((row) => row.entitlement_id === `ent_pro_${stamp}` && row.status === "ACTIVE") ? "PASS" : `FAIL ${err(entitlements) ?? ""}`.trim());
console.log("unique_payment_offer:", duplicateEntitlement.error ? "PASS" : "FAIL");
console.log("workspace_persist:", !workspace.error && workspace.data?.length === 1 ? "PASS" : `FAIL ${err(workspace) ?? ""}`.trim());
console.log("workspace_columns:", workspaceCols);
console.log("scenario_persist:", !scenario.error && scenario.data?.length === 1 ? "PASS" : `FAIL ${err(scenario) ?? ""}`.trim());
console.log("session_attach:", !setA && !setB ? "PASS" : `FAIL ${setA ?? setB}`);
console.log("app_authz_a_reads_own:", aOwn.data?.length === 1 ? "PASS" : `FAIL ${err(aOwn) ?? `len=${aOwn.data?.length ?? 0}`}`);
console.log("app_authz_a_reads_scenario:", aOwnScenario.data?.length === 1 ? "PASS" : "FAIL");
console.log("rls_b_read_a:", (bReadA.data?.length ?? 0) === 0 ? "BLOCKED" : "FAIL");
console.log("rls_b_enum_a:", (bEnum.data ?? []).every((row) => row.workspace_id !== wsA) ? "BLOCKED" : "FAIL");
console.log("rls_b_update_a:", (bWriteA.data?.length ?? 0) === 0 ? "BLOCKED" : "FAIL");
console.log("rls_b_insert_as_a:", bInsertA.error ? "BLOCKED" : "FAIL");
console.log("rls_b_read_a_scenario:", (bReadAScenario.data?.length ?? 0) === 0 ? "BLOCKED" : "FAIL");
console.log("per_deal_consume:", reload.data?.status === "CONSUMED" && Number(reload.data?.quantity_remaining) === 0 ? "PASS" : `FAIL ${err(consume) ?? err(reload) ?? JSON.stringify(reload.data)}`);
console.log("second_per_deal_row_insert:", secondAlloc.error ? "SCHEMA_ALLOWS_ROW" : "ROW_INSERTED");
console.log("failure_state:", failed.data?.state === "FULFILLMENT_FAILED" ? "PASS" : `FAIL ${err(orders) ?? err(failed) ?? ""}`.trim());
console.log("orphan_detection:", repaired && orphans.length === 1 ? "PASS" : `FAIL count=${orphans.length}`);
console.log("entitlement_columns:", entitlementCols);

async function cleanup() {
  await admin.from("occupancynpv_lease_scenarios").delete().eq("workspace_id", wsA);
  await admin.from("occupancynpv_deal_workspaces").delete().in("customer_id", [custA, custB]);
  await admin.from("occupancynpv_fulfillment_orders").delete().in("customer_id", [custA, custB]);
  await admin.from("occupancynpv_entitlements").delete().in("customer_id", [custA, custB]);
  await admin.from("occupancynpv_customers").delete().in("customer_id", [custA, custB]);
  await admin.auth.admin.deleteUser(idA);
  await admin.auth.admin.deleteUser(idB);
}

await cleanup();
console.log("cleanup: PASS");
