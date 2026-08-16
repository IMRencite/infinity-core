import { randomUUID } from "node:crypto";
import type { CreativeBrief, MediaAssetPlan, Shot, ShotPlan, Storyboard, StoryboardScene } from "../types";

export function buildStoryboardFromBrief(brief: CreativeBrief, ventureId: string): Storyboard {
  const storyboardId = randomUUID();
  const isLongForm = (brief.durationSec ?? 0) > 30;

  const sceneCount = isLongForm ? 3 : 1;
  const scenes: StoryboardScene[] = [];
  const shotPlans: ShotPlan[] = [];
  const shots: Shot[] = [];

  for (let s = 0; s < sceneCount; s += 1) {
    const sceneId = randomUUID();
    scenes.push({
      sceneId,
      storyboardId,
      order: s + 1,
      title: `Scene ${s + 1}`,
      purpose: s === 0 ? "Hook and context" : s === sceneCount - 1 ? "Call to action" : "Supporting detail",
      durationSec: isLongForm ? 20 : brief.durationSec ?? 5,
    });

    const shotPlanId = randomUUID();
    shotPlans.push({
      shotPlanId,
      sceneId,
      order: 1,
      shotType: brief.assetType === "video" ? "medium" : "static",
      cameraNotes: brief.cameraGuidance,
      durationSec: brief.durationSec ?? 5,
    });

    shots.push({
      shotId: randomUUID(),
      shotPlanId,
      sceneId,
      briefId: brief.briefId,
      order: 1,
      objective: brief.message,
      requiredCapabilities:
        brief.assetType === "video"
          ? ["TEXT_TO_VIDEO", "SHORT_FORM_VIDEO"]
          : ["IMAGE_GENERATION"],
      durationSec: brief.durationSec ?? 5,
    });
  }

  return {
    storyboardId,
    ventureId,
    briefId: brief.briefId,
    title: `${brief.purpose} storyboard`,
    scenes,
    shotPlans,
    shots,
  };
}

export function buildMediaAssetPlan(input: {
  ventureId: string;
  brief: CreativeBrief;
  opportunityIds: string[];
}): MediaAssetPlan {
  const multiShot = input.brief.assetType === "video" && (input.brief.durationSec ?? 0) <= 30;
  return {
    planId: randomUUID(),
    ventureId: input.ventureId,
    briefId: input.brief.briefId,
    planType: multiShot ? "shot_sequence" : "single_asset",
    assetCount: multiShot ? 2 : 1,
    description: `Plan for ${input.brief.purpose}`,
    mediaOpportunityIds: input.opportunityIds,
  };
}

export function shotsToGenerationTaskCount(storyboard: Storyboard): number {
  return storyboard.shots.length;
}
