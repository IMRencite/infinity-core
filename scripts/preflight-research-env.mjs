import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function parseEnvFile(path) {
  const vals = {};
  const keys = new Set();
  if (!existsSync(path)) return { vals, keys };
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    keys.add(k);
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    vals[k] = v;
  }
  return { vals, keys };
}

const { vals, keys } = parseEnvFile(envPath);

function present(name) {
  const v = vals[name];
  return keys.has(name) && typeof v === "string" && v.length > 8 ? "PRESENT" : "MISSING";
}

console.log("GEMINI_API_KEY:", present("GEMINI_API_KEY"));
console.log(
  "GOOGLE_API_KEY (fallback):",
  present("GOOGLE_API_KEY"),
);
console.log(
  "RESEARCH_PROVIDER:",
  vals.RESEARCH_PROVIDER ? `PRESENT (${vals.RESEARCH_PROVIDER})` : "MISSING",
);
console.log(
  "GEMINI_RESEARCH_MODEL:",
  vals.GEMINI_RESEARCH_MODEL
    ? `PRESENT (${vals.GEMINI_RESEARCH_MODEL})`
    : "MISSING (default: gemini-3.5-flash)",
);
console.log(
  "RESEARCH_ENABLED:",
  vals.RESEARCH_ENABLED ? `PRESENT (${vals.RESEARCH_ENABLED})` : "MISSING",
);
