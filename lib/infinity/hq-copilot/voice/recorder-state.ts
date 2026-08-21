import { HQ_VOICE_MAX_DURATION_MS } from "./constants";
import type { HqVoiceCaptureState, HqVoiceErrorCode } from "./types";

export const HQ_VOICE_USER_MESSAGES: Record<HqVoiceErrorCode, string> = {
  permission_denied: "Microphone permission was denied.",
  no_device: "No microphone is available.",
  unsupported: "Voice recording is not supported in this browser.",
  empty: "Recording is empty.",
  too_long: "Recording exceeded the time limit.",
  too_large: "Recording is too large.",
  unsupported_type: "Unsupported audio type.",
  unavailable: "Speech transcription is unavailable.",
  timeout: "Transcription timed out.",
  network: "Voice upload failed.",
  malformed: "The recording could not be processed.",
  unauthorized: "Sign in to use HQ voice.",
};

export function idleVoiceState(): HqVoiceCaptureState {
  return { status: "idle" };
}

export function requestingVoiceState(): HqVoiceCaptureState {
  return { status: "requesting" };
}

export function recordingVoiceState(startedAt: number): HqVoiceCaptureState {
  return { status: "recording", startedAt };
}

export function transcribingVoiceState(): HqVoiceCaptureState {
  return { status: "transcribing" };
}

export function previewVoiceState(transcript: string): HqVoiceCaptureState {
  return { status: "preview", transcript };
}

export function errorVoiceState(code: HqVoiceErrorCode, message?: string): HqVoiceCaptureState {
  return { status: "error", code, message: message ?? HQ_VOICE_USER_MESSAGES[code] };
}

export function voiceElapsedMs(state: HqVoiceCaptureState, now: number): number {
  if (state.status !== "recording") return 0;
  return Math.max(0, now - state.startedAt);
}

export function shouldAutoStopRecording(state: HqVoiceCaptureState, now: number, maxMs = HQ_VOICE_MAX_DURATION_MS): boolean {
  return state.status === "recording" && voiceElapsedMs(state, now) >= maxMs;
}

export function formatVoiceElapsed(ms: number): string {
  const totalSeconds = Math.min(999, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function mapBrowserGetUserMediaError(error: unknown): HqVoiceErrorCode {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "permission_denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "no_device";
  if (name === "NotSupportedError") return "unsupported";
  return "unsupported";
}
