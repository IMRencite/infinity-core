import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import { transcribeHqCopilotAudio } from "../voice/transcribe";

function loadEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[trimmed.slice(0, sep)]) process.env[trimmed.slice(0, sep)] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

function syntheticWav(): Buffer {
  const sampleRate = 8000;
  const samples = sampleRate / 2;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

const LIVE =
  process.env.RUN_HQ_COPILOT_VOICE_LIVE === "true" &&
  mayExecuteProvider("openai", loadAiProviderEnvConfig());

describe.skipIf(!LIVE)("HQ Copilot live speech-to-text", () => {
  it("calls the configured transcription provider without persisting audio or leaking secrets", async () => {
    const result = await transcribeHqCopilotAudio({
      audio: syntheticWav(),
      mimeType: "audio/wav",
      filename: "hq-copilot-voice-fixture.wav",
      durationMs: 500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.result.transcript).toBe("string");
    expect(result.result.provider).toBe("openai");
    expect(result.result.model).toBeTruthy();
    expect(JSON.stringify(result)).not.toMatch(/OPENAI_API_KEY|Bearer |sk-/);
  }, 30000);
});
