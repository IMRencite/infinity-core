import { createHash } from "node:crypto";
import { afterDarkCreativeDirections, compileGrokApparelPrompt, rejectShallowApparelPrompt } from "./apparel-creative-director";
import { critiqueApparelCandidate, evaluateCandidateDiversity } from "./grok-apparel-critique";
import {
  editXaiImagineImage,
  generateXaiImagineImages,
  listXaiImagineModels,
  classifyXaiImaginePresence,
  XAI_IMAGINE_PREFERRED_MODEL,
} from "./xai-imagine-adapter";
import { routeClubThrottleCreative } from "./xai-imagine";

export const GROK_APPAREL_BATCH_LIMIT = 9 as const;

export type GrokApparelBudget = {
  generations: number;
  edits: number;
  batch_calls: number;
  resolution_2k: number;
  unbounded: false;
};

export async function proveGrokApparelCapability(env: NodeJS.Dict<string> = process.env) {
  const presence = classifyXaiImaginePresence(env);
  const routed = routeClubThrottleCreative(env);
  const listed = presence.credential === "PRESENT" ? await listXaiImagineModels(env) : { model_available: false, models: [] };
  return {
    credential: presence.credential,
    live_execution: presence.live_execution,
    model: XAI_IMAGINE_PREFERRED_MODEL,
    model_available: listed.model_available,
    primary_provider: routed.provider,
    secret_output: false as const,
  };
}

export function planAfterDarkCanary() {
  const directions = afterDarkCreativeDirections();
  if (directions.length < 3) throw new Error("CREATIVE_DIRECTIONS_BELOW_MINIMUM");
  const prompts = directions.map((direction) => ({
    id: direction.id,
    title: direction.title,
    back: compileGrokApparelPrompt({ direction, placement: "back" }),
    front: compileGrokApparelPrompt({ direction, placement: "front" }),
  }));
  if (prompts.some((row) => rejectShallowApparelPrompt(row.back) === "REJECT")) {
    throw new Error("CREATIVE_DIRECTOR_REJECTED_SHALLOW_PROMPT");
  }
  return {
    product: "After Dark",
    directions: directions.length,
    candidates_planned: directions.length * 3,
    bounded: true,
    prompts,
  };
}

export async function generateAfterDarkCanary(input: {
  env?: NodeJS.Dict<string>;
  quality?: "low" | "medium" | "auto";
  resolution?: "1k" | "2k";
}) {
  const env = input.env ?? process.env;
  const plan = planAfterDarkCanary();
  const budget: GrokApparelBudget = { generations: 0, edits: 0, batch_calls: 0, resolution_2k: 0, unbounded: false };
  const candidates: Array<{
    direction_id: string;
    title: string;
    hash: string;
    image: string;
    critique: ReturnType<typeof critiqueApparelCandidate>;
  }> = [];
  for (const prompt of plan.prompts) {
    const generated = await generateXaiImagineImages({
      prompt: prompt.back,
      n: 3,
      aspect_ratio: "3:4",
      resolution: input.resolution ?? "1k",
      quality: input.quality ?? "low",
      env,
    });
    budget.generations += generated.images.length;
    budget.batch_calls += 1;
    if ((input.resolution ?? "1k") === "2k") budget.resolution_2k += generated.images.length;
    for (const image of generated.images) {
      const hash = createHash("sha256").update(image.slice(0, 2000)).digest("hex");
      candidates.push({
        direction_id: prompt.id,
        title: prompt.title,
        hash,
        image,
        critique: critiqueApparelCandidate({
          title: `After Dark ${prompt.title}`,
          art: "Original Club Throttle motorcycle apparel illustration, night rider, coordinated back print.",
          placement: "LARGE_BACK",
          bytes: Math.floor((image.length * 3) / 4),
        }),
      });
    }
  }
  const diversity = evaluateCandidateDiversity(candidates.map((row) => row.hash));
  return {
    plan,
    budget,
    candidates_generated: candidates.length,
    diversity,
    candidates: candidates.map(({ image, ...rest }) => ({ ...rest, bytes: Math.floor((image.length * 3) / 4) })),
    images: candidates.map((row) => row.image),
    model: XAI_IMAGINE_PREFERRED_MODEL,
  };
}

export async function refineApparelCandidate(input: {
  image_b64: string;
  instruction: string;
  env?: NodeJS.Dict<string>;
}) {
  return editXaiImagineImage({
    prompt: `${input.instruction}. Keep this as isolated apparel artwork. Do not generate a T-shirt mockup, hanger, or catalog photo.`,
    image_b64: input.image_b64,
    env: input.env,
  });
}
