import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadResearchConfig, assertResearchProviderExecutable } from "../lib/infinity/research/config.ts";
import { RESEARCH_PROVIDER_IDS } from "../lib/infinity/research/constants.ts";

const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
}

const prodEnv = {
  NODE_ENV: "production",
  RESEARCH_PROVIDER: process.env.RESEARCH_PROVIDER ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
  RESEARCH_ENABLED: process.env.RESEARCH_ENABLED ?? "true",
};

let configQc = "FAIL";
let constructionQc = "FAIL";
let error = null;
try {
  const config = loadResearchConfig(prodEnv);
  assertResearchProviderExecutable(config);
  configQc = "PASS";
  constructionQc = config.providerId === "gemini" && config.geminiApiKey ? "PASS" : "FAIL";
} catch (e) {
  error = e instanceof Error ? e.message : String(e);
}

console.log(
  JSON.stringify(
    {
      RESEARCH_PROVIDER_ALLOWED_VALUES: RESEARCH_PROVIDER_IDS,
      RESEARCH_PROVIDER_PRODUCTION_CONFIG_QC: configQc,
      DISCOVERY_SCANNER_CONSTRUCTION_QC: constructionQc,
      error,
      provider_resolved: prodEnv.RESEARCH_PROVIDER || null,
      gemini_key_present: Boolean(prodEnv.GEMINI_API_KEY),
    },
    null,
    2,
  ),
);
