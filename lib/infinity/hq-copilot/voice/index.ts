export {
  HQ_VOICE_ALLOWED_MIME_TYPES,
  HQ_VOICE_MAX_BYTES,
  HQ_VOICE_MAX_DURATION_MS,
  HQ_VOICE_MIN_BYTES,
  HQ_VOICE_OPENAI_MODEL,
} from "./constants";
export { validateHqVoiceAudio, isAllowedHqVoiceMimeType } from "./audio-validation";
export {
  errorVoiceState,
  formatVoiceElapsed,
  idleVoiceState,
  mapBrowserGetUserMediaError,
  previewVoiceState,
  recordingVoiceState,
  requestingVoiceState,
  shouldAutoStopRecording,
  transcribingVoiceState,
  voiceElapsedMs,
  HQ_VOICE_USER_MESSAGES,
} from "./recorder-state";
export { isBrowserSpeechSynthesisAvailable, shouldSpeakHqCopilotAnswer, spokenAnswerText } from "./speech-output";
export {
  createMockSpeechToTextAdapter,
  createOpenAiSpeechToTextAdapter,
  selectSpeechToTextProvider,
  transcribeHqCopilotAudio,
} from "./transcribe";
export { HQ_VOICE_CAPABILITY } from "./types";
export type {
  HqVoiceCaptureState,
  HqVoiceErrorCode,
  HqVoiceTranscriptionResult,
  SpeechToTextAdapter,
} from "./types";
