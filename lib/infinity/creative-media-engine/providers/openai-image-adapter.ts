import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import type { MediaProviderAdapter } from "../types";

export const openaiMediaAdapter: MediaProviderAdapter = {
  providerId: "openai_media",
  capabilities: ["IMAGE_GENERATION", "IMAGE_EDITING", "THUMBNAIL_GENERATION"],
  isConfigured: () => {
    const config = loadAiProviderEnvConfig();
    return Boolean(config.openaiApiKey) && mayExecuteProvider("openai", config);
  },
  healthScore: () => (loadAiProviderEnvConfig().openaiApiKey ? 0.88 : 0),
  estimateCost: () => 0.05,
  async submitJob({ task, brief, model, outputDir }) {
    const config = loadAiProviderEnvConfig();
    if (!config.openaiApiKey || !mayExecuteProvider("openai", config)) {
      return {
        success: false,
        provider: "openai_media",
        model,
        sync: true,
        usageSource: "UNKNOWN",
        error: "OpenAI media not configured or live execution disabled",
      };
    }

    await mkdir(outputDir, { recursive: true });
    const client = new OpenAI({ apiKey: config.openaiApiKey });
    const imageModel = model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const prompt = `${brief.visualDirection}. ${brief.message}. ${task.prompt}`.slice(0, 32000);

    try {
      const response = await client.images.generate({
        model: imageModel,
        prompt,
        size: "1024x1024",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        return {
          success: false,
          provider: "openai_media",
          model: imageModel,
          sync: true,
          usageSource: "NOT_REPORTED",
          error: "OpenAI image generation returned no data",
        };
      }

      const buffer = Buffer.from(b64, "base64");
      const outputPath = path.join(outputDir, `${task.taskId}.png`);
      await writeFile(outputPath, buffer);

      return {
        success: true,
        provider: "openai_media",
        model: imageModel,
        sync: true,
        outputPath,
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        fileSizeBytes: buffer.length,
        checksum: createHash("sha256").update(buffer).digest("hex"),
        usageSource: "NOT_REPORTED",
        providerMetadata: { revisedPrompt: response.data?.[0]?.revised_prompt ?? null },
      };
    } catch (error) {
      return {
        success: false,
        provider: "openai_media",
        model: imageModel,
        sync: true,
        usageSource: "UNKNOWN",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
