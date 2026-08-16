import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { MediaProviderAdapter } from "../types";

const execFileAsync = promisify(execFile);

let ffmpegAvailableCache: boolean | null = null;

export async function detectFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailableCache != null) return ffmpegAvailableCache;
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 5000 });
    ffmpegAvailableCache = true;
  } catch {
    ffmpegAvailableCache = false;
  }
  return ffmpegAvailableCache;
}

export function resetFfmpegDetectionCacheForTests(): void {
  ffmpegAvailableCache = null;
}

export const ffmpegMediaAdapter: MediaProviderAdapter = {
  providerId: "deterministic_ffmpeg",
  capabilities: [
    "VIDEO_ASSEMBLY",
    "VIDEO_TRANSCODING",
    "FRAME_EXTRACTION",
    "CAPTION_RENDERING",
    "AUDIO_MIXING",
  ],
  isConfigured: () => ffmpegAvailableCache === true,
  healthScore: () => (ffmpegAvailableCache ? 0.99 : 0),
  estimateCost: () => 0.0001,
  async submitJob({ task, outputDir }) {
    const available = await detectFfmpegAvailable();
    if (!available) {
      return {
        success: false,
        provider: "deterministic_ffmpeg",
        model: "ffmpeg-local",
        sync: true,
        usageSource: "UNKNOWN",
        error: "FFmpeg not available in environment",
      };
    }

    await mkdir(outputDir, { recursive: true });

    if (task.taskType === "FRAME_EXTRACTION") {
      const inputPath = task.referenceAssetIds[0];
      if (!inputPath) {
        return {
          success: false,
          provider: "deterministic_ffmpeg",
          model: "ffmpeg-local",
          sync: true,
          usageSource: "UNKNOWN",
          error: "FRAME_EXTRACTION requires reference asset path",
        };
      }
      const outputPath = path.join(outputDir, `${task.taskId}-frame.jpg`);
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inputPath, "-vframes", "1", outputPath],
        { timeout: 30_000 },
      );
      const buffer = await readFile(outputPath);
      return {
        success: true,
        provider: "deterministic_ffmpeg",
        model: "ffmpeg-local",
        sync: true,
        outputPath,
        mimeType: "image/jpeg",
        fileSizeBytes: buffer.length,
        checksum: createHash("sha256").update(buffer).digest("hex"),
        usageSource: "NOT_REPORTED",
      };
    }

    if (task.taskType === "VIDEO_TRANSCODE") {
      const inputPath = task.referenceAssetIds[0];
      if (!inputPath) {
        return {
          success: false,
          provider: "deterministic_ffmpeg",
          model: "ffmpeg-local",
          sync: true,
          usageSource: "UNKNOWN",
          error: "VIDEO_TRANSCODE requires input path",
        };
      }
      const outputPath = path.join(outputDir, `${task.taskId}-transcoded.mp4`);
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "ultrafast", outputPath],
        { timeout: 60_000 },
      );
      const buffer = await readFile(outputPath);
      return {
        success: true,
        provider: "deterministic_ffmpeg",
        model: "ffmpeg-local",
        sync: true,
        outputPath,
        mimeType: "video/mp4",
        fileSizeBytes: buffer.length,
        checksum: createHash("sha256").update(buffer).digest("hex"),
        usageSource: "NOT_REPORTED",
      };
    }

    // VIDEO_ASSEMBLY via concat demuxer on reference assets
    const refs = task.referenceAssetIds.filter(Boolean);
    if (refs.length < 1) {
      const placeholder = path.join(outputDir, `${task.taskId}.mp4`);
      await writeFile(placeholder, "FFMPEG_PLACEHOLDER_NO_INPUT");
      return {
        success: false,
        provider: "deterministic_ffmpeg",
        model: "ffmpeg-local",
        sync: true,
        usageSource: "UNKNOWN",
        error: "VIDEO_ASSEMBLY requires at least one reference asset",
      };
    }

    const listFile = path.join(outputDir, `${task.taskId}-concat.txt`);
    await writeFile(listFile, refs.map((r) => `file '${r.replace(/'/g, "'\\''")}'`).join("\n"));
    const outputPath = path.join(outputDir, `${task.taskId}-assembled.mp4`);
    await execFileAsync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputPath],
      { timeout: 60_000 },
    );
    const buffer = await readFile(outputPath);
    return {
      success: true,
      provider: "deterministic_ffmpeg",
      model: "ffmpeg-local",
      sync: true,
      outputPath,
      mimeType: "video/mp4",
      fileSizeBytes: buffer.length,
      checksum: createHash("sha256").update(buffer).digest("hex"),
      usageSource: "NOT_REPORTED",
    };
  },
};

export async function initFfmpegAdapter(): Promise<void> {
  await detectFfmpegAvailable();
}
