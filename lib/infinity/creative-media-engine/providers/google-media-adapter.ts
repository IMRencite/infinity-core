import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import type { MediaProviderAdapter, MediaProviderCallResult } from "../types";

function getApiKey(): string | null {
  const config = loadAiProviderEnvConfig();
  return config.geminiApiKey ?? config.googleApiKey;
}

export const googleMediaAdapter: MediaProviderAdapter = {
  providerId: "google_media",
  capabilities: [
    "IMAGE_GENERATION",
    "TEXT_TO_VIDEO",
    "IMAGE_TO_VIDEO",
    "REFERENCE_TO_VIDEO",
    "THUMBNAIL_GENERATION",
  ],
  isConfigured: () => {
    const config = loadAiProviderEnvConfig();
    return Boolean(getApiKey()) && mayExecuteProvider("google_gemini", config);
  },
  healthScore: () => (getApiKey() ? 0.85 : 0),
  estimateCost: ({ taskType, durationSec }) =>
    taskType.includes("VIDEO") ? 0.08 * (durationSec ?? 5) : 0.04,
  async submitJob({ task, brief, model, outputDir }) {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: "google_media",
        model,
        sync: false,
        usageSource: "UNKNOWN",
        error: "Google media API key not configured",
      };
    }

    await mkdir(outputDir, { recursive: true });
    const client = new GoogleGenAI({ apiKey });
    const prompt = `${brief.visualDirection}. ${brief.message}. ${task.prompt}`.slice(0, 2000);

    try {
      if (task.taskType.includes("VIDEO")) {
        const videoModel = model.includes("veo") ? model : process.env.GOOGLE_VEO_MODEL ?? "veo-2.0-generate-001";
        const operation = await client.models.generateVideos({
          model: videoModel,
          source: { prompt },
          config: { numberOfVideos: 1, aspectRatio: brief.aspectRatio ?? "16:9" },
        });

        const providerJobId =
          (operation as { name?: string }).name ??
          (operation as { operation?: { name?: string } }).operation?.name ??
          `google-video-op-${Date.now()}`;

        return {
          success: true,
          provider: "google_media",
          model: videoModel,
          providerJobId,
          sync: false,
          usageSource: "NOT_REPORTED",
          providerMetadata: { operation: operation as unknown as Record<string, unknown> },
        };
      }

      const imageModel = model.includes("imagen") ? model : process.env.GOOGLE_IMAGEN_MODEL ?? "imagen-4.0-generate-001";
      const response = await client.models.generateImages({
        model: imageModel,
        prompt,
        config: { numberOfImages: 1 },
      });

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) {
        return {
          success: false,
          provider: "google_media",
          model: imageModel,
          sync: true,
          usageSource: "NOT_REPORTED",
          error: "No image bytes returned from Google media API",
        };
      }

      const buffer = Buffer.from(imageBytes, "base64");
      const outputPath = path.join(outputDir, `${task.taskId}.png`);
      await writeFile(outputPath, buffer);
      const checksum = createHash("sha256").update(buffer).digest("hex");

      return {
        success: true,
        provider: "google_media",
        model: imageModel,
        sync: true,
        outputPath,
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        fileSizeBytes: buffer.length,
        checksum,
        usageSource: "NOT_REPORTED",
        providerMetadata: { responseMeta: response as unknown as Record<string, unknown> },
      };
    } catch (error) {
      return {
        success: false,
        provider: "google_media",
        model,
        sync: task.taskType.includes("VIDEO") ? false : true,
        usageSource: "UNKNOWN",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  async pollJob({ providerJobId, model, outputDir }) {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: "google_media",
        model,
        sync: true,
        usageSource: "UNKNOWN",
        error: "Google media API key not configured",
      };
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const operation = await client.operations.getVideosOperation({
        operation: { name: providerJobId } as never,
      });

      const done = Boolean((operation as { done?: boolean }).done);
      if (!done) {
        return {
          success: true,
          provider: "google_media",
          model,
          providerJobId,
          sync: false,
          usageSource: "NOT_REPORTED",
          providerMetadata: { done: false },
        };
      }

      const videoBytes =
        (operation as { response?: { generatedVideos?: Array<{ video?: { videoBytes?: string } }> } })
          .response?.generatedVideos?.[0]?.video?.videoBytes;
      if (!videoBytes) {
        return {
          success: false,
          provider: "google_media",
          model,
          providerJobId,
          sync: true,
          usageSource: "NOT_REPORTED",
          error: "Video operation completed without output bytes",
        };
      }

      await mkdir(outputDir, { recursive: true });
      const buffer = Buffer.from(videoBytes, "base64");
      const outputPath = path.join(outputDir, `${providerJobId}.mp4`);
      await writeFile(outputPath, buffer);
      return {
        success: true,
        provider: "google_media",
        model,
        providerJobId,
        sync: true,
        outputPath,
        mimeType: "video/mp4",
        width: 1280,
        height: 720,
        durationSec: 5,
        fileSizeBytes: buffer.length,
        checksum: createHash("sha256").update(buffer).digest("hex"),
        usageSource: "NOT_REPORTED",
      };
    } catch (error) {
      return {
        success: false,
        provider: "google_media",
        model,
        providerJobId,
        sync: true,
        usageSource: "UNKNOWN",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
