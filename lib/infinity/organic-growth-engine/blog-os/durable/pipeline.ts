import { evaluateRenderedPageVerificationCheck, type RenderedPageInput } from "./verifier";
import { DurableBlogStore } from "./store";
import type { DurableBlogHold } from "./types";

export function attemptPublish(input: {
  store: DurableBlogStore;
  venture_id: string;
  operating_date: string;
  now: string;
  hold: DurableBlogHold | null;
  pre_publish: RenderedPageInput;
}): { ok: boolean; reason: string } {
  const check = evaluateRenderedPageVerificationCheck({ ...input.pre_publish, mode: "PRE_PUBLISH" });
  return input.store.transition({
    venture_id: input.venture_id,
    operating_date: input.operating_date,
    to: "PUBLISHED",
    actor: "PUBLISHER",
    invoked_by: "PIPELINE",
    now: input.now,
    hold: input.hold,
    pre_publish: check.result === "PASS" ? "PASS" : "FAIL",
  });
}

export function attemptLiveVerify(input: {
  store: DurableBlogStore;
  venture_id: string;
  operating_date: string;
  now: string;
  live: RenderedPageInput;
}): { ok: boolean; reason: string } {
  const check = evaluateRenderedPageVerificationCheck({ ...input.live, mode: "LIVE_POST_PUBLISH" });
  return input.store.transition({
    venture_id: input.venture_id,
    operating_date: input.operating_date,
    to: "LIVE_VERIFIED",
    actor: "LIVE_VERIFIER",
    invoked_by: "PIPELINE",
    now: input.now,
    live_post_publish: check.result === "PASS" ? "PASS" : "FAIL",
    live_url: input.live.url,
  });
}
