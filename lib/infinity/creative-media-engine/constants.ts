export const CREATIVE_MEDIA_ENGINE_VERSION = "creative_media_engine_v1";
export const CREATIVE_MEDIA_BUILD_PACKAGE_VERSION = "creative_media_build_package_v1";

export const MEDIA_JOB_STATUSES = [
  "CREATED",
  "QUEUED",
  "SUBMITTED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
] as const;

export const MEDIA_OPPORTUNITY_DECISIONS = [
  "CREATE_PREMIUM",
  "CREATE_STANDARD",
  "CREATE_ECONOMY",
  "DETERMINISTIC_ONLY",
  "REUSE_EXISTING",
  "DEFER",
  "REJECT",
] as const;

export const MEDIA_ASSET_TYPES = [
  "image",
  "video",
  "audio",
  "thumbnail",
  "diagram",
  "infographic",
  "storyboard",
  "caption",
  "voiceover",
  "music",
  "sfx",
] as const;

export const MEDIA_GENERATION_TASK_TYPES = [
  "IMAGE_GENERATION",
  "IMAGE_EDIT",
  "IMAGE_VARIATION",
  "IMAGE_UPSCALE",
  "TEXT_TO_VIDEO",
  "IMAGE_TO_VIDEO",
  "REFERENCE_TO_VIDEO",
  "FIRST_LAST_FRAME_VIDEO",
  "VIDEO_EXTENSION",
  "VIDEO_EDIT",
  "THUMBNAIL_GENERATION",
  "VOICE_GENERATION",
  "MUSIC_GENERATION",
  "SFX_GENERATION",
  "VIDEO_ASSEMBLY",
  "VIDEO_TRANSCODE",
  "AUDIO_MIX",
  "CAPTION_RENDER",
  "FRAME_EXTRACTION",
] as const;

export const MEDIA_CAPABILITIES = [
  "IMAGE_GENERATION",
  "IMAGE_EDITING",
  "IMAGE_VARIATION",
  "IMAGE_UPSCALING",
  "TEXT_TO_VIDEO",
  "IMAGE_TO_VIDEO",
  "REFERENCE_TO_VIDEO",
  "FIRST_LAST_FRAME_VIDEO",
  "VIDEO_EXTENSION",
  "SUBJECT_REFERENCE",
  "CHARACTER_CONSISTENCY",
  "PRODUCT_CONSISTENCY",
  "STYLE_CONSISTENCY",
  "NATIVE_AUDIO_VIDEO",
  "VOICE_GENERATION",
  "MUSIC_GENERATION",
  "SOUND_EFFECT_GENERATION",
  "THUMBNAIL_GENERATION",
  "DIAGRAM_GENERATION",
  "VIDEO_ASSEMBLY",
  "VIDEO_TRANSCODING",
  "AUDIO_MIXING",
  "CAPTION_RENDERING",
  "FRAME_EXTRACTION",
  "LONG_FORM_VIDEO",
  "SHORT_FORM_VIDEO",
  "VERTICAL_VIDEO",
  "HORIZONTAL_VIDEO",
] as const;

export const PRODUCTION_MEDIA_STATUSES = [
  "DRAFT",
  "PLANNED",
  "GENERATING",
  "GENERATED",
  "UNDER_REVIEW",
  "REPAIR_REQUIRED",
  "BLOCKED",
  "READY",
  "REJECTED",
] as const;

export const QUALITY_GATE_TYPES = [
  "TECHNICAL_VALIDITY",
  "PROMPT_ALIGNMENT",
  "VISUAL_COHERENCE",
  "SUBJECT_CONSISTENCY",
  "BRAND_ALIGNMENT",
  "FACTUAL_VISUAL_ACCURACY",
  "TEXT_LEGIBILITY",
  "COMPOSITION",
  "RELEVANCE",
  "ARTIFACT_DETECTION",
  "AI_SLOP_RISK",
  "MISLEADING_CONTENT_RISK",
  "ECONOMIC_VALUE",
  "TEMPORAL_COHERENCE",
  "CAMERA_COHERENCE",
  "MOTION_QUALITY",
  "AUDIO_SYNC",
  "THUMBNAIL_TRUTHFULNESS",
] as const;

export const REVIEW_SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const REPAIR_ACTIONS = [
  "REPROMPT",
  "REGENERATE",
  "CHANGE_MODEL",
  "CHANGE_PROVIDER",
  "CHANGE_REFERENCE",
  "EDIT_EXISTING",
  "SPLIT_SCENE",
  "MERGE_SCENES",
  "USE_DETERMINISTIC_RENDER",
  "DOWNGRADE_ASSET",
  "REJECT_ASSET",
] as const;

export const ECONOMICS_SOURCES = ["KNOWN", "DERIVED", "ESTIMATED", "UNKNOWN"] as const;

export const DEFAULT_MEDIA_BUDGET = {
  maxCostPerAssetUsd: 2.5,
  maxCostPerRunUsd: 15,
  maxRepairAttempts: 2,
  maxRetryAttempts: 2,
  maxVideoDurationSec: 8,
};

export type MediaJobStatus = (typeof MEDIA_JOB_STATUSES)[number];
export type MediaOpportunityDecision = (typeof MEDIA_OPPORTUNITY_DECISIONS)[number];
export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number];
export type MediaGenerationTaskType = (typeof MEDIA_GENERATION_TASK_TYPES)[number];
export type MediaCapability = (typeof MEDIA_CAPABILITIES)[number];
export type ProductionMediaStatus = (typeof PRODUCTION_MEDIA_STATUSES)[number];
export type QualityGateType = (typeof QUALITY_GATE_TYPES)[number];
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];
export type RepairActionType = (typeof REPAIR_ACTIONS)[number];
export type EconomicsSource = (typeof ECONOMICS_SOURCES)[number];
