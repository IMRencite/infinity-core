import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaProviderAdapter, MediaProviderCallResult } from "../types";

function pngStub(width: number, height: number, label: string): Buffer {
  // Minimal valid 1x1 PNG header + IHDR - for tests use tiny placeholder
  const content = `MOCK_PNG:${width}x${height}:${label}`;
  return Buffer.from(content, "utf8");
}

export const mockMediaProvider: MediaProviderAdapter = {
  providerId: "mock_media",
  capabilities: [
    "IMAGE_GENERATION",
    "TEXT_TO_VIDEO",
    "THUMBNAIL_GENERATION",
    "SHORT_FORM_VIDEO",
    "VERTICAL_VIDEO",
  ],
  isConfigured: () => true,
  healthScore: () => 1,
  estimateCost: ({ taskType, durationSec }) =>
    taskType.includes("VIDEO") ? 0.002 * (durationSec ?? 5) : 0.001,
  async submitJob({ task, brief, model, outputDir }) {
    await mkdir(outputDir, { recursive: true });
    const isVideo = task.taskType.includes("VIDEO");
    const ext = isVideo ? "mp4" : "png";
    const fileName = `${task.taskId}.${ext}`;
    const outputPath = path.join(outputDir, fileName);
    const body = isVideo
      ? `MOCK_VIDEO:${brief.message}:${model}`
      : pngStub(512, 512, brief.message).toString("utf8");
    await writeFile(outputPath, body, "utf8");
    const checksum = createHash("sha256").update(body).digest("hex");
    return {
      success: true,
      provider: "mock_media",
      model,
      providerJobId: isVideo ? `mock-job-${randomUUID()}` : undefined,
      sync: !isVideo,
      outputPath,
      mimeType: isVideo ? "video/mp4" : "image/png",
      width: 512,
      height: 512,
      durationSec: isVideo ? task.durationSec ?? 5 : undefined,
      fileSizeBytes: Buffer.byteLength(body),
      checksum,
      estimatedCostUsd: isVideo ? 0.01 : 0.001,
      actualCostUsd: isVideo ? 0.01 : 0.001,
      usageSource: "ESTIMATED",
    } satisfies MediaProviderCallResult;
  },
  async pollJob({ providerJobId, model, outputDir }) {
    const outputPath = path.join(outputDir, `${providerJobId}.mp4`);
    const body = `MOCK_VIDEO_POLL:${providerJobId}:${model}`;
    await writeFile(outputPath, body, "utf8");
    return {
      success: true,
      provider: "mock_media",
      model,
      providerJobId,
      sync: true,
      outputPath,
      mimeType: "video/mp4",
      width: 1280,
      height: 720,
      durationSec: 5,
      fileSizeBytes: Buffer.byteLength(body),
      checksum: createHash("sha256").update(body).digest("hex"),
      actualCostUsd: 0.01,
      usageSource: "ESTIMATED",
    };
  },
};
