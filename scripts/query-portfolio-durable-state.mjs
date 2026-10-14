import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[t.slice(0, i)] = v;
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: pubs } = await admin.from("autonomous_venture_publication_registry").select("*");
const { data: jobs } = await admin
  .from("autonomous_portfolio_jobs")
  .select("job_type,status,cycle_id,venture_id,safe_error,input_lineage")
  .order("created_at", { ascending: false })
  .limit(20);
console.log(JSON.stringify({ pubs, jobs }, null, 2));
