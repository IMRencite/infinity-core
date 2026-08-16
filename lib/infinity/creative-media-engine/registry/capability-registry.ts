import type { MediaCapability, MediaGenerationTaskType } from "../constants";
import type { MediaProviderAdapter } from "../types";

export type ProviderCapabilityRegistration = {
  providerId: string;
  model: string;
  capabilities: MediaCapability[];
  maxDurationSec?: number;
  maxResolution?: string;
  supportedAspectRatios?: string[];
  referenceInputSupport: boolean;
  audioSupport: boolean;
  asyncExecution: boolean;
  estimatedCostPerImageUsd?: number;
  estimatedCostPerVideoSecondUsd?: number;
  reliabilityScore: number;
  qualityScore: number;
  latencyScore: number;
};

const REGISTRY: ProviderCapabilityRegistration[] = [];

export function registerProviderCapabilities(entry: ProviderCapabilityRegistration): void {
  REGISTRY.push(entry);
}

export function clearProviderCapabilityRegistryForTests(): void {
  REGISTRY.splice(0, REGISTRY.length);
}

export function getProviderCapabilityRegistrations(): ProviderCapabilityRegistration[] {
  return [...REGISTRY];
}

export function findCapableProviders(required: MediaCapability[]): ProviderCapabilityRegistration[] {
  return REGISTRY.filter((entry) => required.every((cap) => entry.capabilities.includes(cap)));
}

export function taskTypeToCapabilities(taskType: MediaGenerationTaskType): MediaCapability[] {
  const map: Partial<Record<MediaGenerationTaskType, MediaCapability[]>> = {
    IMAGE_GENERATION: ["IMAGE_GENERATION"],
    IMAGE_EDIT: ["IMAGE_EDITING"],
    IMAGE_VARIATION: ["IMAGE_VARIATION"],
    IMAGE_UPSCALE: ["IMAGE_UPSCALING"],
    TEXT_TO_VIDEO: ["TEXT_TO_VIDEO"],
    IMAGE_TO_VIDEO: ["IMAGE_TO_VIDEO"],
    REFERENCE_TO_VIDEO: ["REFERENCE_TO_VIDEO"],
    FIRST_LAST_FRAME_VIDEO: ["FIRST_LAST_FRAME_VIDEO"],
    VIDEO_EXTENSION: ["VIDEO_EXTENSION"],
    THUMBNAIL_GENERATION: ["THUMBNAIL_GENERATION"],
    VOICE_GENERATION: ["VOICE_GENERATION"],
    MUSIC_GENERATION: ["MUSIC_GENERATION"],
    SFX_GENERATION: ["SOUND_EFFECT_GENERATION"],
    VIDEO_ASSEMBLY: ["VIDEO_ASSEMBLY"],
    VIDEO_TRANSCODE: ["VIDEO_TRANSCODING"],
    AUDIO_MIX: ["AUDIO_MIXING"],
    CAPTION_RENDER: ["CAPTION_RENDERING"],
    FRAME_EXTRACTION: ["FRAME_EXTRACTION"],
  };
  return map[taskType] ?? [];
}

export function bootstrapDefaultCapabilityRegistry(adapters: MediaProviderAdapter[]): void {
  if (REGISTRY.length > 0) return;
  for (const adapter of adapters) {
    if (!adapter.isConfigured()) continue;
    if (adapter.providerId === "google_media") {
      registerProviderCapabilities({
        providerId: "google_media",
        model: process.env.GOOGLE_IMAGEN_MODEL ?? "imagen-4.0-generate-001",
        capabilities: [
          "IMAGE_GENERATION",
          "IMAGE_EDITING",
          "THUMBNAIL_GENERATION",
          "DIAGRAM_GENERATION",
        ],
        referenceInputSupport: true,
        audioSupport: false,
        asyncExecution: false,
        estimatedCostPerImageUsd: 0.04,
        reliabilityScore: 0.82,
        qualityScore: 0.86,
        latencyScore: 0.75,
      });
      registerProviderCapabilities({
        providerId: "google_media",
        model: process.env.GOOGLE_VEO_MODEL ?? "veo-2.0-generate-001",
        capabilities: [
          "TEXT_TO_VIDEO",
          "IMAGE_TO_VIDEO",
          "REFERENCE_TO_VIDEO",
          "SHORT_FORM_VIDEO",
          "VERTICAL_VIDEO",
          "HORIZONTAL_VIDEO",
        ],
        maxDurationSec: 8,
        referenceInputSupport: true,
        audioSupport: true,
        asyncExecution: true,
        estimatedCostPerVideoSecondUsd: 0.08,
        reliabilityScore: 0.78,
        qualityScore: 0.84,
        latencyScore: 0.45,
      });
    }
    if (adapter.providerId === "openai_media") {
      registerProviderCapabilities({
        providerId: "openai_media",
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        capabilities: ["IMAGE_GENERATION", "IMAGE_EDITING", "THUMBNAIL_GENERATION"],
        referenceInputSupport: false,
        audioSupport: false,
        asyncExecution: false,
        estimatedCostPerImageUsd: 0.05,
        reliabilityScore: 0.88,
        qualityScore: 0.85,
        latencyScore: 0.8,
      });
    }
    if (adapter.providerId === "mock_media") {
      registerProviderCapabilities({
        providerId: "mock_media",
        model: "mock-image-v1",
        capabilities: [
          "IMAGE_GENERATION",
          "IMAGE_EDITING",
          "THUMBNAIL_GENERATION",
          "DIAGRAM_GENERATION",
        ],
        referenceInputSupport: true,
        audioSupport: false,
        asyncExecution: false,
        estimatedCostPerImageUsd: 0.001,
        reliabilityScore: 1,
        qualityScore: 0.7,
        latencyScore: 1,
      });
      registerProviderCapabilities({
        providerId: "mock_media",
        model: "mock-video-v1",
        capabilities: [
          "TEXT_TO_VIDEO",
          "SHORT_FORM_VIDEO",
          "VERTICAL_VIDEO",
          "REFERENCE_TO_VIDEO",
        ],
        maxDurationSec: 8,
        referenceInputSupport: true,
        audioSupport: false,
        asyncExecution: true,
        estimatedCostPerVideoSecondUsd: 0.002,
        reliabilityScore: 1,
        qualityScore: 0.72,
        latencyScore: 0.95,
      });
      registerProviderCapabilities({
        providerId: "mock_media",
        model: "mock-economy-v1",
        capabilities: ["IMAGE_GENERATION", "THUMBNAIL_GENERATION"],
        referenceInputSupport: false,
        audioSupport: false,
        asyncExecution: false,
        estimatedCostPerImageUsd: 0.0005,
        reliabilityScore: 0.95,
        qualityScore: 0.55,
        latencyScore: 0.98,
      });
    }
    if (adapter.providerId === "deterministic_ffmpeg") {
      registerProviderCapabilities({
        providerId: "deterministic_ffmpeg",
        model: "ffmpeg-local",
        capabilities: [
          "VIDEO_ASSEMBLY",
          "VIDEO_TRANSCODING",
          "FRAME_EXTRACTION",
          "CAPTION_RENDERING",
          "AUDIO_MIXING",
        ],
        referenceInputSupport: true,
        audioSupport: true,
        asyncExecution: false,
        estimatedCostPerVideoSecondUsd: 0.0001,
        reliabilityScore: 0.99,
        qualityScore: 0.9,
        latencyScore: 0.85,
      });
    }
  }
}
