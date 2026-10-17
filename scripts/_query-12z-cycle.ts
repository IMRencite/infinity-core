import { readFileSync } from "node:fs";
import { createPortfolioDurableSupabase, PORTFOLIO_DURABLE_TABLES } from "../lib/infinity/autonomous-portfolio-operations/durable/portfolio-durable-supabase-v1";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
}

async function main() {
  const db = createPortfolioDurableSupabase();
  const { data: cycles } = await db
    .from(PORTFOLIO_DURABLE_TABLES.cycles)
    .select("*")
    .gte("started_at", "2026-10-17T11:55:00Z")
    .lte("started_at", "2026-10-17T13:00:00Z")
    .order("started_at", { ascending: true });
  if (!cycles?.length) {
    console.log(JSON.stringify({ found: false, now: new Date().toISOString(), window: "2026-10-17T12:00:00Z" }));
    return;
  }
  for (const c of cycles) {
    const { data: jobs } = await db
      .from(PORTFOLIO_DURABLE_TABLES.jobs)
      .select("job_id,job_type,venture_id,status,safe_error,idempotency_key,output_lineage")
      .eq("cycle_id", c.cycle_id);
    console.log(JSON.stringify({ cycle: c, jobs }, null, 2));
  }
}

void main();
