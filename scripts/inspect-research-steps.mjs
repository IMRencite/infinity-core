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

const { data: run } = await admin.from("research_runs").select("raw_provider_response, grounding_metadata, structured_result").eq("id", id).maybeSingle();
const raw = run?.raw_provider_response;
const steps = raw?.steps ?? [];
console.log("step types:", steps.map((s) => s.type));
for (const step of steps) {
  if (step.type === "google_search_call") {
    console.log("\n=== google_search_call keys ===", Object.keys(step));
    console.log("result keys:", step.result ? Object.keys(step.result) : "none");
    console.log("output keys:", step.output ? Object.keys(step.output) : "none");
    const json = JSON.stringify(step).slice(0, 3000);
    console.log("sample:", json);
  }
  if (step.type === "google_search_result") {
    console.log("\n=== google_search_result keys ===", Object.keys(step));
    const json = JSON.stringify(step).slice(0, 4000);
    console.log("sample:", json);
  }
  if (step.type === "model_output") {
    console.log("\n=== model_output ===");
    const content = step.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        console.log("block type:", block?.type, "keys:", block ? Object.keys(block) : []);
        if (block?.type === "text") {
          const text = block.text?.slice(0, 200);
          console.log("text preview:", text);
        }
      }
    }
  }
}
