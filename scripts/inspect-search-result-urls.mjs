import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const id = process.argv[2];
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: run } = await admin.from("research_runs").select("raw_provider_response").eq("id", id).maybeSingle();
const steps = run?.raw_provider_response?.steps ?? [];

function collectUrls(value, urls = new Set(), depth = 0) {
  if (depth > 12) return urls;
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    for (const m of matches) urls.add(m.slice(0, 120));
    return urls;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, urls, depth + 1);
    return urls;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (["url", "uri", "link", "source_url", "sourceUrl"].includes(k) && typeof v === "string") {
        urls.add(v);
      }
      collectUrls(v, urls, depth + 1);
    }
  }
  return urls;
}

for (const step of steps) {
  if (step.type !== "google_search_result") continue;
  const result = step.result;
  console.log("\n=== google_search_result ===");
  if (Array.isArray(result)) {
    for (const [i, item] of result.entries()) {
      console.log(`item[${i}] keys:`, Object.keys(item ?? {}));
    }
  }
  const urls = [...collectUrls(step)].slice(0, 20);
  console.log("urls found:", urls);
}
