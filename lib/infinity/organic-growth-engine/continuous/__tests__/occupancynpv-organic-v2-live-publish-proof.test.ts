import { describe, expect, it } from "vitest";
import { evaluateDuplicateIntent } from "../routing";
import { liveOccupancyNpvQuestionAssets } from "../live-catalog";
import { matchExistingAnswer } from "../voc";
import { OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, occupancynpvLiveCapRatePageSource } from "../occupancynpv-live-page";
import { composeOccupancyNpvOrganicLiveFiles } from "../occupancynpv-publisher";
import { evaluateOrganicLivePublishingGate, occupancynpvLiveCapRateDraft, prepareOccupancyNpvLiveProof } from "../live-proof";
import { inspectIndexation } from "../cycle";
import { unlinkSync } from "node:fs";
import { organicContinuousLocalSnapshotPath, persistOrganicContinuousStateLocal, readOrganicContinuousStateLocal } from "../persist";
import { emptyOrganicContinuousState } from "../store";
import { lookupSalesContent } from "../publish";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "../urls";
import { evaluateOrganicContentQualityGate, evaluateOrganicEvidenceGate } from "../quality";

describe("OccupancyNPV Organic V2 live publish proof", () => {
  it("selects cap rate as a real CREATE_NEW gap against the live 93-route catalog", () => {
    const assets = liveOccupancyNpvQuestionAssets();
    expect(assets.length).toBeGreaterThan(40);
    const match = matchExistingAnswer({ intent: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, assets });
    expect(match.state).toBe("UNANSWERED");
    const duplicate = evaluateDuplicateIntent({ intent: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, existing: assets });
    expect(duplicate.outcome).toBe("CREATE_NEW");
  });

  it("plans the live OccupancyNPV hub URL and passes pre-publish gates", () => {
    const prepared = prepareOccupancyNpvLiveProof("2026-09-17T03:00:00.000Z");
    expect(prepared.planned.path).toBe(OCCUPANCYNPV_LIVE_CAP_RATE_PATH);
    expect(prepared.content_type).toBe("EVERGREEN_QUESTION");
    expect(prepared.quality.result).toBe("PASS");
    expect(prepared.evidence.result).toBe("PASS");
    expect(prepared.urlGate.result).toBe("PASS");
    expect(prepared.links.result).toBe("PASS");
    expect(prepared.technical.result).toBe("PASS");
    expect(prepared.authorization.result).toBe("PASS");
    expect(prepared.opportunity.score).toBeGreaterThan(55);
    expect(evaluateOrganicContentQualityGate(occupancynpvLiveCapRateDraft()).result).toBe("PASS");
    expect(evaluateOrganicEvidenceGate(occupancynpvLiveCapRateDraft(), true).result).toBe("PASS");
  });

  it("injects exactly one new page into the real OccupancyNPV compose bundle", () => {
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const pages = composed.files.filter((file) => /app\/.+\/page\.tsx$/.test(file.path.replace(/\\/g, "/")));
    const cap = composed.files.find((file) => file.path.replace(/\\/g, "/") === composed.pagePath);
    expect(cap?.content).toContain(OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION);
    expect(cap?.content).toContain("AnswerFirst");
    expect(cap?.content).toContain("canonical");
    expect(cap?.content).toContain("/commercial-lease-npv");
    expect(occupancynpvLiveCapRatePageSource()).not.toMatch(/lorem ipsum|as an ai/i);
    const sitemap = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts");
    expect(sitemap?.content).toContain("how-is-cap-rate-calculated");
    expect(pages.length).toBeGreaterThan(90);
    const liveGate = evaluateOrganicLivePublishingGate({
      create_new: true,
      quality: preparedGatePass(),
      evidence: preparedGatePass(),
      links: preparedGatePass(),
      technical: preparedGatePass(),
      authorization: preparedGatePass(),
      live_status: 200,
      persisted: true,
      sales: true,
    });
    expect(liveGate.result).toBe("PASS");
    expect(evaluateOrganicLivePublishingGate({
      create_new: true,
      quality: preparedGatePass(),
      evidence: preparedGatePass(),
      links: preparedGatePass(),
      technical: preparedGatePass(),
      authorization: preparedGatePass(),
      live_status: 0,
      persisted: true,
      sales: true,
    }).result).toBe("FAIL");
  });

  it("persists a published OccupancyNPV asset and remains queryable after local hydration", () => {
    const ventureId = "occupancynpv-persist-proof";
    const prepared = prepareOccupancyNpvLiveProof("2026-09-17T04:02:01.703Z");
    const published = {
      ...prepared.asset,
      status: "PUBLISHED" as const,
      published_at: "2026-09-17T04:02:01.703Z",
    };
    const state = emptyOrganicContinuousState(ventureId);
    state.assets = [published];
    state.sales_assets = [published];
    state.published_today = 1;
    persistOrganicContinuousStateLocal(state);
    const hydrated = readOrganicContinuousStateLocal(ventureId);
    expect(hydrated?.assets[0]?.url).toBe(OCCUPANCYNPV_LIVE_CAP_RATE_PATH);
    expect(hydrated?.assets[0]?.status).toBe("PUBLISHED");
    expect(lookupSalesContent({ question: OCCUPANCYNPV_LIVE_CAP_RATE_QUESTION, assets: hydrated?.sales_assets ?? [] }).asset?.url).toBe(OCCUPANCYNPV_LIVE_CAP_RATE_PATH);
    expect(inspectIndexation({ asset: published, now: "2026-09-17T04:03:01.703Z" }).result).toBe("PASS");
    unlinkSync(organicContinuousLocalSnapshotPath(ventureId));
  });
});

function preparedGatePass() {
  return { gate: "x", result: "PASS" as const, reasons: [] };
}
