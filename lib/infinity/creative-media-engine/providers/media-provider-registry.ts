import type { MediaProviderAdapter } from "../types";
import { googleMediaAdapter } from "./google-media-adapter";
import { mockMediaProvider } from "./mock-media-provider";
import { openaiMediaAdapter } from "./openai-image-adapter";
import { ffmpegMediaAdapter, initFfmpegAdapter } from "../deterministic/ffmpeg-adapter";

const ADAPTERS: MediaProviderAdapter[] = [
  mockMediaProvider,
  googleMediaAdapter,
  openaiMediaAdapter,
  ffmpegMediaAdapter,
];

export async function bootstrapMediaProviders(liveMode = false): Promise<MediaProviderAdapter[]> {
  await initFfmpegAdapter();
  const allowMock =
    !liveMode &&
    process.env.CREATIVE_MEDIA_ALLOW_MOCK !== "false";
  return ADAPTERS.filter((a) => a.providerId !== "mock_media" || allowMock);
}

export function getMediaProviderAdapter(providerId: string): MediaProviderAdapter | null {
  return ADAPTERS.find((a) => a.providerId === providerId) ?? null;
}

export function getConfiguredMediaProviders(liveMode: boolean): MediaProviderAdapter[] {
  if (!liveMode) return [mockMediaProvider];
  return ADAPTERS.filter((a) => a.isConfigured());
}

export { mockMediaProvider, googleMediaAdapter, openaiMediaAdapter, ffmpegMediaAdapter };
