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
  if (!process.env[key]) process.env[key] = val;
}

const stamp = Date.now();
const email = `onpv.signup.${stamp}@example.com`;
const password = "OccupancyNpvTest1";
const res = await fetch("https://occupancynpv.com/api/occupancynpv/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const body = await res.json().catch(() => ({}));
console.log("signup_status", res.status);
console.log("signup_ok", body.ok === true ? "YES" : "NO");
console.log("signup_reason", body.reason ?? "NONE");
console.log("set_cookie", res.headers.getSetCookie?.()?.length ?? (res.headers.get("set-cookie") ? "present" : "none"));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = (users.data?.users ?? []).find((row) => row.email === email);
console.log("auth_user_created", user ? "YES" : "NO");
if (user) {
  const customer = await admin.from("occupancynpv_customers").select("customer_id").eq("auth_identity_id", user.id).maybeSingle();
  console.log("customer_row", customer.data ? "YES" : `NO ${customer.error?.code ?? ""}`.trim());
  await admin.from("occupancynpv_customers").delete().eq("auth_identity_id", user.id);
  await admin.auth.admin.deleteUser(user.id);
  console.log("cleanup", "PASS");
}
