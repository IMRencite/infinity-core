import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ASKREVIEW_JSON_PRODUCTION_FALLBACK,
  ASKREVIEW_JSON_STORE_CLASSIFICATION,
  askReviewJsonProductionFallback,
  classifyAskReviewJsonStore,
  repoCreateLocation,
  repoFulfillKit,
  repoSignup,
  createAskReviewAccount,
  createAskReviewLocation,
  decodeReviewUrlFromQrSvg,
  evaluateAskReviewFulfillmentReadiness,
  evaluateAskReviewPriceEvidence,
  evaluateAskReviewProductQc,
  evaluateAskReviewVentureBackendReadiness,
  extractPlaceId,
  fulfillAskReviewKit,
  generateReviewKit,
  getAskReviewLocation,
  listAskReviewLocations,
  listKitsForLocation,
  normalizeReviewTarget,
  patchAskReviewLocation,
  qrSvgEncodesUrl,
  resetAskReviewStore,
  signInAskReview,
  verifyAskReviewKit,
} from "..";
import { collectAskReviewBackendEvidence } from "../readiness";
import { askReviewLocationCollectionContract } from "../collection";
import { askReviewPaymentPreparation, askReviewValidationExperiment } from "../pricing";
import { askReviewDataInventory, askReviewGooglePartnershipImplication } from "../legal";
import { askReviewCookieHeader } from "../session";
import { ASKREVIEW_DOMAIN_CANDIDATES } from "@/lib/infinity/second-venture-factory/constants";
import { askReviewVentureBackendContract } from "@/lib/infinity/second-venture-factory/backend";
import { evaluateMultiVentureFactoryGeneralizationGate } from "@/lib/infinity/second-venture-factory/generalization-gate";
import { persistAskReviewOperationalRecord } from "@/lib/infinity/second-venture-factory/persist-record";
import { evaluateSecondVentureHqProjection } from "@/lib/infinity/second-venture-factory/hq";
import { backfillCreVentureOperationalRecord, resetVentureOperatingScaleStore, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale";
import { COLLECTION_SCALE_FIXTURES } from "@/lib/infinity/public-venture-design/rendered-interaction/product-collection";

const PLACE_ID = "ChIJAskReviewFactoryProof001";

describe("AskReview production product", () => {
  beforeEach(() => {
    resetAskReviewStore();
    resetVentureOperatingScaleStore();
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
  });
  afterEach(() => {
    resetAskReviewStore();
    resetVentureOperatingScaleStore();
  });

  it("rejects invented review destinations and unsupported Maps URLs", () => {
    expect(generateReviewKit({ businessName: "Harbor Coffee" }).ok).toBe(false);
    expect(generateReviewKit({ businessName: "X", mapsUrl: "http://example.com" }).ok).toBe(false);
    const shortMaps = normalizeReviewTarget({ mapsUrl: "https://maps.app.goo.gl/abc" });
    expect(shortMaps.ok).toBe(false);
    if (!shortMaps.ok) {
      expect(shortMaps.reason).toBe("UNSUPPORTED_MAPS_URL");
    }
    expect(extractPlaceId("Harbor Coffee")).toBeNull();
    const fromUrl = normalizeReviewTarget({
      mapsUrl: `https://www.google.com/maps/place/Harbor/@1,1,17z/data=!3m1!4b1?query_place_id=${PLACE_ID}`,
    });
    expect(fromUrl.ok).toBe(true);
    if (fromUrl.ok) {
      expect(fromUrl.reviewUrl).toBe(`https://search.google.com/local/writereview?placeid=${PLACE_ID}`);
    }
  });

  it("generates a deterministic review URL, QR equivalence, and request copy", () => {
    const kit = generateReviewKit({ businessName: "Harbor Coffee", placeId: PLACE_ID });
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.reviewUrl).toBe(`https://search.google.com/local/writereview?placeid=${PLACE_ID}`);
    expect(decodeReviewUrlFromQrSvg(kit.qrSvg)).toBe(kit.reviewUrl);
    expect(qrSvgEncodesUrl(kit.qrSvg, kit.reviewUrl)).toBe(true);
    expect(kit.copyVariants.sms).toContain(kit.reviewUrl);
    expect(kit.copyVariants.email).toContain(kit.reviewUrl);
    expect(kit.copyVariants.counter).toContain(kit.reviewUrl);
    expect(kit.copyVariants.email).toMatch(/does not send email/i);
  });

  it("persists kits with tenant isolation, retry, and bounded history", () => {
    const owner = createAskReviewAccount({ email: "owner@example.com", password: "password1" });
    const other = createAskReviewAccount({ email: "other@example.com", password: "password1" });
    expect(owner.ok && other.ok).toBe(true);
    if (!owner.ok || !other.ok) return;
    expect(signInAskReview({ email: "owner@example.com", password: "wrong-pass" }).ok).toBe(false);
    const location = createAskReviewLocation({
      accountId: owner.account.accountId,
      name: "Harbor Coffee",
      placeId: PLACE_ID,
    });
    expect(location.ok).toBe(true);
    if (!location.ok) return;
    expect(getAskReviewLocation(other.account.accountId, location.location.locationId)).toBeNull();
    const first = fulfillAskReviewKit({ accountId: owner.account.accountId, locationId: location.location.locationId });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(verifyAskReviewKit(first.kit).complete).toBe(true);
    const retry = fulfillAskReviewKit({ accountId: owner.account.accountId, locationId: location.location.locationId });
    expect(retry.ok).toBe(true);
    expect(listKitsForLocation(owner.account.accountId, location.location.locationId).length).toBe(2);
    expect(listKitsForLocation(other.account.accountId, location.location.locationId)).toHaveLength(0);
    const foreign = fulfillAskReviewKit({ accountId: other.account.accountId, locationId: location.location.locationId });
    expect(foreign.ok).toBe(false);
  });

  it("scales the location collection at 0/1/10/25/100 without unbounded render", () => {
    const account = createAskReviewAccount({ email: "scale@example.com", password: "password1" });
    expect(account.ok).toBe(true);
    if (!account.ok) return;
    expect(COLLECTION_SCALE_FIXTURES).toEqual([0, 1, 10, 25, 100]);
    expect(askReviewLocationCollectionContract().boundedListStrategy).toBe("PAGINATION");
    expect(listAskReviewLocations({ accountId: account.account.accountId }).total).toBe(0);
    for (let i = 0; i < 100; i += 1) {
      createAskReviewLocation({
        accountId: account.account.accountId,
        name: `Shop ${i}`,
        placeId: `ChIJAskReviewShop${String(i).padStart(4, "0")}xx`,
      });
    }
    const page1 = listAskReviewLocations({ accountId: account.account.accountId, page: 1 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(100);
    const archived = patchAskReviewLocation({
      accountId: account.account.accountId,
      locationId: page1.items[0]!.locationId,
      status: "ARCHIVED",
    });
    expect(archived?.status).toBe("ARCHIVED");
    expect(listAskReviewLocations({ accountId: account.account.accountId, status: "ARCHIVED" }).total).toBe(1);
  });
});

describe("AskReview backend, fulfillment, economics, and QC", () => {
  beforeEach(() => {
    resetAskReviewStore();
    resetVentureOperatingScaleStore();
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    persistAskReviewOperationalRecord();
  });

  it("refuses JSON production fallback when Supabase is required", async () => {
    expect(askReviewJsonProductionFallback()).toBe(ASKREVIEW_JSON_PRODUCTION_FALLBACK);
    expect(ASKREVIEW_JSON_PRODUCTION_FALLBACK).toBe("DISABLED");
    const prior = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const priorService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ASKREVIEW_TEST_PRODUCTION_REQUIRED = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://igenurhjwdjxqzflpgxl.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ASKREVIEW_FORCE_IN_PROCESS;
    const signup = await repoSignup({ email: "fallback@example.com", password: "password1" });
    expect(signup.ok).toBe(false);
    if (!signup.ok) expect(signup.reason).toBe("PRODUCTION_PERSISTENCE_UNAVAILABLE");
    const created = await repoCreateLocation({ accountId: "acct_other", name: "X", placeId: "ChIJAskReviewFactoryProof001" });
    expect(created.ok).toBe(false);
    const kit = await repoFulfillKit({ accountId: "acct_other", locationId: "loc_other" });
    expect(kit.ok).toBe(false);
    delete process.env.ASKREVIEW_TEST_PRODUCTION_REQUIRED;
    if (prior) process.env.NEXT_PUBLIC_SUPABASE_URL = prior;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (priorService) process.env.SUPABASE_SERVICE_ROLE_KEY = priorService;
  });

  it("classifies the JSON store as validation-only and binds Supabase", () => {
    expect(classifyAskReviewJsonStore()).toBe(ASKREVIEW_JSON_STORE_CLASSIFICATION);
    expect(ASKREVIEW_JSON_STORE_CLASSIFICATION).toBe("VALIDATION_ONLY");
    const contract = askReviewVentureBackendContract();
    expect(contract.providerBindings.some((row) => row.providerFamily === "supabase")).toBe(true);
    expect(askReviewCookieHeader("ses_test", true)).toContain("HttpOnly");
    expect(askReviewCookieHeader("ses_test", true)).toContain("Secure");
    expect(askReviewCookieHeader("ses_test", true)).toContain("SameSite=Lax");
  });

  it("evaluates backend readiness from evidence without inventing production writes", async () => {
    const evidence = await collectAskReviewBackendEvidence();
    expect(evidence.jsonStoreClassification).toBe("VALIDATION_ONLY");
    expect(evidence.tenantIsolationVerified).toBe(true);
    expect(evidence.productionReadWriteVerified).toBe(false);
    const live = evaluateAskReviewVentureBackendReadiness(evidence);
    expect(live.result).toBe("FAIL");
    const complete = evaluateAskReviewVentureBackendReadiness({
      ...evidence,
      productionProviderBound: true,
      databaseOrStorageReachable: true,
      productionReadWriteVerified: true,
    });
    expect(complete.result).toBe("PASS");
  });

  it("passes fulfillment readiness independently of Stripe", () => {
    const gate = evaluateAskReviewFulfillmentReadiness();
    expect(gate.result).toBe("PASS");
    expect(askReviewPaymentPreparation().PaymentReadinessGate).toBe("BLOCKED");
    expect(askReviewPaymentPreparation().stripeWrites).toBe(0);
  });

  it("keeps $29/month hypothetical and defines a validation experiment", () => {
    const price = evaluateAskReviewPriceEvidence();
    expect(price.decision).toBe("PRICE_VALIDATION_REQUIRED");
    expect(price.canonicalPrice).toBe("UNRESOLVED");
    expect(price.cac).toBe("UNKNOWN");
    expect(price.ltv).toBe("UNKNOWN");
    const experiment = askReviewValidationExperiment();
    expect(experiment.liveBillingRequired).toBe(false);
    expect(experiment.currentOutcome).toBe("NOT_STARTED");
    expect(experiment.minimumEvidence).toMatch(/15/);
  });

  it("passes product QC gates and returning-customer access", () => {
    const qc = evaluateAskReviewProductQc();
    expect(qc.dashboard.result).toBe("PASS");
    expect(qc.empty.result).toBe("PASS");
    expect(qc.collectionScale.result).toBe("PASS");
    expect(qc.collectionLifecycle.result).toBe("PASS");
    expect(qc.result.result).toBe("PASS");
    expect(qc.selected.result).toBe("PASS");
    expect(qc.returning.result).toBe("PASS");
    expect(qc.gutter.result).toBe("PASS");
    expect(qc.subItems.result).toBe("PASS");
  });

  it("keeps isolated preview off OccupancyNPV routes, runtime, and search indexing", () => {
    const proxy = readFileSync("proxy.ts", "utf8");
    const layout = readFileSync("app/askreview/layout.tsx", "utf8");
    const sitemap = readFileSync("app/askreview/sitemap.xml/route.ts", "utf8");
    expect(proxy).toContain("ASKREVIEW_ISOLATED_PREVIEW");
    expect(proxy).toContain("/occupancynpv");
    expect(proxy).toContain("/api/checkout");
    expect(proxy).toContain("/api/runtime");
    expect(layout).toMatch(/index:\s*false/);
    expect(sitemap).toContain("ASKREVIEW_PUBLICLY_LAUNCHED");
    expect(sitemap).toContain("noindex");
  });

  it("keeps legal inventory truthful and HQ visible", () => {
    expect(askReviewGooglePartnershipImplication()).toBe("NONE");
    expect(askReviewDataInventory().sending).toMatch(/does not send/i);
    expect(askReviewDataInventory().notClaimed).toContain("Google partnership");
    expect(evaluateSecondVentureHqProjection().result).toBe("PASS");
    expect(evaluateMultiVentureFactoryGeneralizationGate().result).toBe("PASS");
    expect(ASKREVIEW_DOMAIN_CANDIDATES).toContain("askreview.com");
  });
});
