import {
  OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER,
  OCCUPANCYNPV_CAM_FIRST_YEAR_PATH,
} from "./occupancynpv-cam-first-year-page";
import { composeOccupancyNpvOrganicLiveFiles, deployOccupancyNpvOrganicLivePage, fetchPublicHtml } from "./occupancynpv-publisher";
import type { OrganicLivePublishResult } from "@/lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution";

export function occupancyNpvCamPageIsInLiveBundle(): boolean {
  return composeOccupancyNpvOrganicLiveFiles().files.some((file) =>
    file.path.replace(/\\/g, "/").includes("cam-first-year"),
  );
}

export async function publishOccupancyNpvCamFirstYearLive(input: {
  deploy?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}): Promise<OrganicLivePublishResult> {
  const publicUrl = `https://occupancynpv.com${OCCUPANCYNPV_CAM_FIRST_YEAR_PATH}`;
  if (!occupancyNpvCamPageIsInLiveBundle()) {
    return { ok: false, public_url: publicUrl, public_mutation: false, reason: "CAM_PAGE_NOT_IN_BUNDLE" };
  }
  const deployed = await deployOccupancyNpvOrganicLivePage({
    deploy: input.deploy,
    pollAttempts: input.pollAttempts ?? 3,
    pollDelayMs: input.pollDelayMs ?? 3000,
  });
  if (deployed.safe_error && !deployed.deployed) {
    return {
      ok: false,
      public_url: publicUrl,
      deployment_id: deployed.deployment_id,
      aliased: deployed.aliased,
      public_mutation: Boolean(deployed.deployment_id),
      reason: deployed.safe_error,
    };
  }
  const live = deployed.deployed ? await fetchPublicHtml(publicUrl) : { ok: false, status: 0, body: "" };
  const html = live.body ?? "";
  const matches = live.ok && html.includes(OCCUPANCYNPV_CAM_FIRST_YEAR_MARKER);
  return {
    ok: Boolean(deployed.deployed && matches),
    public_url: publicUrl,
    deployment_id: deployed.deployment_id,
    aliased: deployed.aliased,
    live_html: html,
    live_status: live.status,
    public_mutation: Boolean(deployed.deployed),
    reason: matches ? null : deployed.safe_error ?? "LIVE_MARKER_MISSING",
  };
}
