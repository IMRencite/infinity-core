import { randomUUID } from "node:crypto";
import { toFile } from "openai";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import { recordProviderTelemetry } from "@/lib/infinity/ai-providers/observability";
import { createInternalOpenAiClient } from "@/lib/infinity/ai-providers/openai/client";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { classifyOpenAiError } from "@/lib/infinity/ai-providers/openai/errors";
import { MAX_COPILOT_QUESTION_CHARS } from "../types";
import { validateHqVoiceAudio } from "./audio-validation";
import {
  HQ_VOICE_OPENAI_MODEL,
  HQ_VOICE_PROVIDER_TIMEOUT_MS,
  HQ_VOICE_WHISPER_USD_PER_MINUTE,
} from "./constants";
import { HQ_VOICE_CAPABILITY, type HqVoiceTranscriptionResult, type SpeechToTextAdapter, type SpeechToTextRequest } from "./types";

function estimateWhisperCostUsd(durationMs: number | null, bytes: number): number {
  const minutesFromDuration = durationMs != null ? durationMs / 60_000 : bytes / (32_000 * 60);
  return Math.max(0, Number((minutesFromDuration * HQ_VOICE_WHISPER_USD_PER_MINUTE).toFixed(6)));
}

function clampTranscript(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_COPILOT_QUESTION_CHARS);
}

export function createMockSpeechToTextAdapter(
  transcript = "Which venture has the highest recorded margin?",
): SpeechToTextAdapter {
  return {
    id: "mock",
    capability: HQ_VOICE_CAPABILITY,
    model: "mock-stt",
    isEligible() {
      return true;
    },
    async transcribe() {
      return {
        transcript,
        provider: "mock",
        model: "mock-stt",
        latencyMs: 1,
        costUsd: 0,
      };
    },
  };
}

export function createOpenAiSpeechToTextAdapter(): SpeechToTextAdapter {
  return {
    id: "openai",
    capability: HQ_VOICE_CAPABILITY,
    model: HQ_VOICE_OPENAI_MODEL,
    isEligible() {
      const config = loadAiProviderEnvConfig();
      return mayExecuteProvider("openai", config);
    },
    async transcribe(input: SpeechToTextRequest) {
      const openai = loadOpenAiReasoningConfig();
      if (!openai.apiKey) {
        throw Object.assign(new Error("Speech transcription is unavailable."), { code: "unavailable" });
      }
      const started = Date.now();
      const client = createInternalOpenAiClient({
        ...openai,
        timeoutMs: Math.min(openai.timeoutMs, HQ_VOICE_PROVIDER_TIMEOUT_MS),
      });
      try {
        const file = await toFile(input.audio, input.filename || "hq-copilot-voice.webm", {
          type: input.mimeType || "audio/webm",
        });
        const result = await client.audio.transcriptions.create({
          file,
          model: HQ_VOICE_OPENAI_MODEL,
        });
        const transcript = clampTranscript(typeof result === "string" ? result : result.text ?? "");
        return {
          transcript,
          provider: "openai",
          model: HQ_VOICE_OPENAI_MODEL,
          latencyMs: Date.now() - started,
          costUsd: estimateWhisperCostUsd(input.durationMs, input.audio.byteLength),
        };
      } catch (error) {
        throw classifyOpenAiError(error);
      }
    },
  };
}

export function selectSpeechToTextProvider(override?: SpeechToTextAdapter | null): SpeechToTextAdapter | null {
  if (override) return override;
  const openai = createOpenAiSpeechToTextAdapter();
  if (openai.isEligible()) return openai;
  return null;
}

export async function transcribeHqCopilotAudio(input: {
  audio: Buffer;
  mimeType: string | null | undefined;
  filename?: string;
  durationMs?: unknown;
  provider?: SpeechToTextAdapter | null;
}): Promise<
  | { ok: true; result: HqVoiceTranscriptionResult }
  | { ok: false; status: number; code: string; message: string }
> {
  const validated = validateHqVoiceAudio({
    bytes: input.audio.byteLength,
    mimeType: input.mimeType,
    durationMs: input.durationMs,
  });
  if (!validated.ok) {
    return { ok: false, status: validated.status, code: validated.code, message: validated.message };
  }

  const provider = selectSpeechToTextProvider(input.provider);
  if (!provider?.isEligible()) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      message: "Speech transcription is unavailable.",
    };
  }

  const started = Date.now();
  try {
    const transcribed = await provider.transcribe({
      audio: input.audio,
      mimeType: validated.mimeType,
      filename: input.filename || "hq-copilot-voice.webm",
      durationMs: validated.durationMs,
    });
    const result: HqVoiceTranscriptionResult = {
      transcript: clampTranscript(transcribed.transcript),
      provider: transcribed.provider,
      model: transcribed.model,
      latencyMs: transcribed.latencyMs,
      costUsd: transcribed.costUsd,
      durationMs: validated.durationMs,
      bytes: validated.bytes,
    };
    recordProviderTelemetry({
      id: randomUUID(),
      correlationId: "hq-copilot-voice",
      providerId: provider.id === "openai" ? "openai" : "mock",
      modelId: result.model,
      latencyMs: result.latencyMs,
      tokenEstimate: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costEstimate: {
        currency: "USD",
        inputCost: result.costUsd,
        outputCost: 0,
        totalCost: result.costUsd,
      },
      retries: 0,
      errorCode: null,
      errorMessage: null,
      occurredAt: new Date().toISOString(),
    });
    return { ok: true, result };
  } catch (error) {
    const classified = error as { code?: string; message?: string };
    const code = classified.code === "timeout" ? "timeout" : classified.code === "rate_limit" ? "unavailable" : "unavailable";
    recordProviderTelemetry({
      id: randomUUID(),
      correlationId: "hq-copilot-voice",
      providerId: provider.id === "openai" ? "openai" : "mock",
      modelId: provider.model,
      latencyMs: Date.now() - started,
      tokenEstimate: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costEstimate: { currency: "USD", inputCost: null, outputCost: null, totalCost: null },
      retries: 0,
      errorCode: code,
      errorMessage: "transcription_failed",
      occurredAt: new Date().toISOString(),
    });
    return {
      ok: false,
      status: code === "timeout" ? 504 : 503,
      code,
      message: code === "timeout" ? "Transcription timed out." : "Speech transcription is unavailable.",
    };
  }
}
