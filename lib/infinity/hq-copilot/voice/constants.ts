export const HQ_VOICE_MAX_DURATION_MS = 45_000;
export const HQ_VOICE_MAX_BYTES = 1_500_000;
export const HQ_VOICE_MIN_BYTES = 256;
export const HQ_VOICE_PROVIDER_TIMEOUT_MS = 20_000;
export const HQ_VOICE_OPENAI_MODEL = "whisper-1";
export const HQ_VOICE_WHISPER_USD_PER_MINUTE = 0.006;

export const HQ_VOICE_ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/ogg;codecs=opus",
] as const;

export type HqVoiceAllowedMimeType = (typeof HQ_VOICE_ALLOWED_MIME_TYPES)[number];
