import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import {
  classifyXaiImaginePresence,
  listXaiImagineModels,
  XAI_IMAGINE_PREFERRED_MODEL,
} from "./xai-imagine-adapter";

export const GROK_IMAGE_PROVIDER_HEALTH_GATE = "GrokImageProviderHealth" as const;

export type GrokImageProviderHealth = {
  gate: typeof GROK_IMAGE_PROVIDER_HEALTH_GATE;
  provider_module: "lib/infinity/commerce/creative-media/xai-imagine-adapter.ts";
  image_model: string;
  credential: "PRESENT" | "ABSENT";
  live_execution: boolean;
  model_available: boolean;
  health: "PASS" | "BLOCKED_CREDENTIAL" | "BLOCKED_LIVE_EXECUTION" | "BLOCKED_MODEL";
  required_env: string[];
  secret_output: false;
};

export async function evaluateGrokImageProviderHealth(
  env: NodeJS.Dict<string> = process.env,
): Promise<GrokImageProviderHealth> {
  const presence = classifyXaiImaginePresence(env);
  const config = loadAiProviderEnvConfig(env as NodeJS.ProcessEnv);
  const listed =
    presence.credential === "PRESENT" ? await listXaiImagineModels(env) : { model_available: false, models: [] as string[] };
  let health: GrokImageProviderHealth["health"] = "PASS";
  if (presence.credential !== "PRESENT") health = "BLOCKED_CREDENTIAL";
  else if (!mayExecuteProvider("xai", config)) health = "BLOCKED_LIVE_EXECUTION";
  else if (!listed.model_available) health = "BLOCKED_MODEL";

  return {
    gate: GROK_IMAGE_PROVIDER_HEALTH_GATE,
    provider_module: "lib/infinity/commerce/creative-media/xai-imagine-adapter.ts",
    image_model: XAI_IMAGINE_PREFERRED_MODEL,
    credential: presence.credential,
    live_execution: presence.live_execution,
    model_available: listed.model_available,
    health,
    required_env: ["XAI_API_KEY", "AI_PROVIDER_XAI_ENABLED=true", "AI_PROVIDER_ALLOW_LIVE_EXECUTION=true"],
    secret_output: false,
  };
}
