import {
  HQ_VOICE_ALLOWED_MIME_TYPES,
  HQ_VOICE_MAX_BYTES,
  HQ_VOICE_MAX_DURATION_MS,
  HQ_VOICE_MIN_BYTES,
} from "./constants";
import type { HqVoiceErrorCode } from "./types";

export type AudioValidationFailure = {
  ok: false;
  code: Extract<HqVoiceErrorCode, "empty" | "too_large" | "too_long" | "unsupported_type" | "malformed">;
  message: string;
  status: 400;
};

export type AudioValidationSuccess = {
  ok: true;
  mimeType: string;
  bytes: number;
  durationMs: number | null;
};

export function normalizeAudioMimeType(value: string | null | undefined): string {
  return (value ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAllowedHqVoiceMimeType(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return false;
  if ((HQ_VOICE_ALLOWED_MIME_TYPES as readonly string[]).includes(raw)) return true;
  const normalized = normalizeAudioMimeType(raw);
  return (HQ_VOICE_ALLOWED_MIME_TYPES as readonly string[]).some(
    (allowed) => normalizeAudioMimeType(allowed) === normalized,
  );
}

export function parseOptionalDurationMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric);
}

export function validateHqVoiceAudio(input: {
  bytes: number;
  mimeType: string | null | undefined;
  durationMs?: unknown;
}): AudioValidationSuccess | AudioValidationFailure {
  if (!Number.isFinite(input.bytes) || input.bytes < HQ_VOICE_MIN_BYTES) {
    return { ok: false, code: "empty", message: "Recording is empty.", status: 400 };
  }
  if (input.bytes > HQ_VOICE_MAX_BYTES) {
    return { ok: false, code: "too_large", message: "Recording is too large.", status: 400 };
  }
  if (!isAllowedHqVoiceMimeType(input.mimeType)) {
    return { ok: false, code: "unsupported_type", message: "Unsupported audio type.", status: 400 };
  }
  const durationMs = parseOptionalDurationMs(input.durationMs);
  if (durationMs != null && durationMs > HQ_VOICE_MAX_DURATION_MS) {
    return { ok: false, code: "too_long", message: "Recording is too long.", status: 400 };
  }
  return {
    ok: true,
    mimeType: (input.mimeType ?? "").trim().toLowerCase(),
    bytes: input.bytes,
    durationMs,
  };
}
