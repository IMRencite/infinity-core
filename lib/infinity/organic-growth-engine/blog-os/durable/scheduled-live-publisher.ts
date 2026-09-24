import {
  OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
  OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-cam-first-year-page";
import { publishOccupancyNpvCamFirstYearLive } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-organic-publish-adapter";
import type { OrganicLivePublishResult } from "./scheduled-execution";

export async function publishOrganicScheduledLivePage(): Promise<OrganicLivePublishResult> {
  try {
    return await publishOccupancyNpvCamFirstYearLive();
  } catch {
    return {
      ok: false,
      public_url: `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`,
      public_mutation: false,
      reason: "PUBLISH_THREW",
    };
  }
}

export function publicCamUrl(): string {
  return `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`;
}

export async function fetchPublicCamPage(url = publicCamUrl()): Promise<{ status: number; html: string }> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { status: response.status, html: await response.text() };
  } catch {
    return { status: 0, html: "" };
  }
}

export function liveHtmlMatchesCamArtifact(html: string): boolean {
  return html.includes(OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER)
    && /cam in the first operating year/i.test(html)
    && !/club throttle/i.test(html);
}
