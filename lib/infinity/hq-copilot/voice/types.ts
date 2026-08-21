export const HQ_VOICE_CAPABILITY = "SPEECH_TO_TEXT" as const;
export type HqVoiceCapability = typeof HQ_VOICE_CAPABILITY;

export const HQ_VOICE_ERROR_CODES = [
  "permission_denied",
  "no_device",
  "unsupported",
  "empty",
  "too_long",
  "too_large",
  "unsupported_type",
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "unauthorized",
] as const;

export type HqVoiceErrorCode = (typeof HQ_VOICE_ERROR_CODES)[number];

export type HqVoiceCaptureState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "recording"; startedAt: number }
  | { status: "transcribing" }
  | { status: "preview"; transcript: string }
  | { status: "error"; code: HqVoiceErrorCode; message: string };

export type HqVoiceTranscriptionResult = {
  transcript: string;
  provider: string;
  model: string;
  latencyMs: number;
  costUsd: number;
  durationMs: number | null;
  bytes: number;
};

export type SpeechToTextRequest = {
  audio: Buffer;
  mimeType: string;
  filename: string;
  durationMs: number | null;
};

export type SpeechToTextAdapter = {
  readonly id: string;
  readonly capability: HqVoiceCapability;
  readonly model: string;
  isEligible(): boolean;
  transcribe(input: SpeechToTextRequest): Promise<Omit<HqVoiceTranscriptionResult, "durationMs" | "bytes">>;
};
