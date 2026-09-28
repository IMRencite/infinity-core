import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";

export const XAI_IMAGINE_PROVIDER = "XAI_IMAGINE" as const;
export const XAI_IMAGINE_PREFERRED_MODEL = "grok-imagine-image-2.0" as const;
export const XAI_IMAGE_GENERATIONS = "https://api.x.ai/v1/images/generations" as const;
export const XAI_IMAGE_EDITS = "https://api.x.ai/v1/images/edits" as const;
export const XAI_MODELS = "https://api.x.ai/v1/models" as const;

export type XaiImagineCapability = {
  credential: "PRESENT" | "ABSENT";
  live_execution: boolean;
  model: string;
  model_available: boolean;
  image_generation: "PASS" | "FAIL" | "NOT_PROVEN";
  image_editing: "PASS" | "FAIL" | "NOT_PROVEN";
  batch_generation: "PASS" | "NOT_PROVEN";
  output_2k: "PASS" | "NOT_PROVEN";
  secret_output: false;
};

function xaiKey(env: NodeJS.Dict<string> = process.env): string | null {
  return env.XAI_API_KEY?.trim() || null;
}

export function classifyXaiImaginePresence(env: NodeJS.Dict<string> = process.env): Pick<XaiImagineCapability, "credential" | "live_execution" | "secret_output"> {
  const config = loadAiProviderEnvConfig(env as NodeJS.ProcessEnv);
  return {
    credential: xaiKey(env) ? "PRESENT" : "ABSENT",
    live_execution: mayExecuteProvider("xai", config),
    secret_output: false,
  };
}

export async function listXaiImagineModels(env: NodeJS.Dict<string> = process.env): Promise<{ model_available: boolean; models: string[] }> {
  const key = xaiKey(env);
  if (!key) return { model_available: false, models: [] };
  const response = await fetch(XAI_MODELS, { headers: { Authorization: `Bearer ${key}` } });
  const json = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
  const models = (json?.data ?? []).map((row) => row.id ?? "").filter((id) => /imagine|image/i.test(id));
  return {
    model_available: models.includes(XAI_IMAGINE_PREFERRED_MODEL) || models.some((id) => id.startsWith("grok-imagine-image")),
    models,
  };
}

export async function generateXaiImagineImages(input: {
  prompt: string;
  n?: number;
  aspect_ratio?: string;
  resolution?: "1k" | "2k";
  quality?: "low" | "medium" | "auto";
  env?: NodeJS.Dict<string>;
}): Promise<{ ok: boolean; model: string; images: string[]; error?: string; failure_class?: "SPEND_LIMIT" | "UNAUTHORIZED" | "HTTP_FAIL"; batch: boolean; resolution: string }> {
  const env = input.env ?? process.env;
  const key = xaiKey(env);
  const model = XAI_IMAGINE_PREFERRED_MODEL;
  if (!key) return { ok: false, model, images: [], error: "XAI_CREDENTIAL_ABSENT", batch: false, resolution: input.resolution ?? "1k" };
  if (!mayExecuteProvider("xai", loadAiProviderEnvConfig(env as NodeJS.ProcessEnv))) {
    return { ok: false, model, images: [], error: "XAI_LIVE_EXECUTION_DISABLED", batch: false, resolution: input.resolution ?? "1k" };
  }
  const n = Math.min(Math.max(input.n ?? 1, 1), 10);
  const response = await fetch(XAI_IMAGE_GENERATIONS, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: input.prompt,
      n,
      aspect_ratio: input.aspect_ratio ?? "3:4",
      resolution: input.resolution ?? "1k",
      quality: input.quality ?? "low",
      response_format: "b64_json",
    }),
  });
  const json = await response.json().catch(() => null) as { data?: Array<{ b64_json?: string; url?: string }>; error?: { message?: string } } | null;
  const images = (json?.data ?? []).map((row) => row.b64_json ?? row.url ?? "").filter(Boolean);
  const error = response.ok ? undefined : json?.error?.message ?? `XAI_HTTP_${response.status}`;
  return {
    ok: response.ok && images.length > 0,
    model,
    images,
    error,
    failure_class: response.ok ? undefined : classifyXaiImagineHttpFailure(response.status, error),
    batch: n > 1 && images.length > 1,
    resolution: input.resolution ?? "1k",
  };
}

export async function editXaiImagineImage(input: {
  prompt: string;
  image_b64: string;
  env?: NodeJS.Dict<string>;
}): Promise<{ ok: boolean; model: string; image?: string; error?: string }> {
  const env = input.env ?? process.env;
  const key = xaiKey(env);
  const model = XAI_IMAGINE_PREFERRED_MODEL;
  if (!key) return { ok: false, model, error: "XAI_CREDENTIAL_ABSENT" };
  const response = await fetch(XAI_IMAGE_EDITS, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: input.prompt,
      image: { url: `data:image/png;base64,${input.image_b64}`, type: "image_url" },
      response_format: "b64_json",
    }),
  });
  const json = await response.json().catch(() => null) as { data?: Array<{ b64_json?: string }>; error?: { message?: string } } | null;
  const image = json?.data?.[0]?.b64_json;
  return {
    ok: response.ok && Boolean(image),
    model,
    image,
    error: response.ok ? undefined : json?.error?.message ?? `XAI_HTTP_${response.status}`,
  };
}

export function classifyXaiImagineHttpFailure(status: number, message?: string): "SPEND_LIMIT" | "UNAUTHORIZED" | "HTTP_FAIL" {
  if (status === 401 || status === 403 && /unauthorized|invalid api/i.test(message ?? "")) return "UNAUTHORIZED";
  if (status === 403 && /credit|spending limit|monthly/i.test(message ?? "")) return "SPEND_LIMIT";
  return "HTTP_FAIL";
}
