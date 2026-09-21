import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAskReviewAccount,
  createAskReviewKit,
  createAskReviewLocation,
  generateReviewKit,
  listAskReviewLocations,
  listKitsForLocation,
  patchAskReviewLocation,
  resetAskReviewStore,
  verifyAskReviewKit,
} from "..";
import { askReviewFooterHtml, evaluateAskReviewFooterContract } from "../public-footer";

describe("AskReview product", () => {
  beforeEach(() => resetAskReviewStore());
  afterEach(() => resetAskReviewStore());

  it("rejects invalid targets and fulfills a valid Place ID kit", () => {
    expect(generateReviewKit({ businessName: "X", mapsUrl: "http://example.com" }).ok).toBe(false);
    const account = createAskReviewAccount({ email: "a@example.com", password: "password1" });
    expect(account.ok).toBe(true);
    if (!account.ok) return;
    const location = createAskReviewLocation({
      accountId: account.account.accountId,
      name: "Harbor Coffee",
      placeId: "ChIJHarborCoffeeAskReview01",
    });
    expect(location.ok).toBe(true);
    if (!location.ok) return;
    const kit = createAskReviewKit({ accountId: account.account.accountId, locationId: location.location.locationId });
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(verifyAskReviewKit(kit.kit).complete).toBe(true);
    expect(listKitsForLocation(account.account.accountId, location.location.locationId).length).toBe(1);
  });

  it("paginates and archives locations without inventing entitlement restore", () => {
    const account = createAskReviewAccount({ email: "b@example.com", password: "password1" });
    if (!account.ok) return;
    for (let i = 0; i < 12; i += 1) {
      createAskReviewLocation({
        accountId: account.account.accountId,
        name: `Shop ${i}`,
        placeId: `ChIJAskReviewShop${String(i).padStart(4, "0")}xx`,
      });
    }
    const page1 = listAskReviewLocations({ accountId: account.account.accountId, page: 1 });
    const page2 = listAskReviewLocations({ accountId: account.account.accountId, page: 2 });
    expect(page1.items).toHaveLength(10);
    expect(page2.items.length).toBeGreaterThan(0);
    const archived = patchAskReviewLocation({
      accountId: account.account.accountId,
      locationId: page1.items[0]!.locationId,
      status: "ARCHIVED",
    });
    expect(archived?.status).toBe("ARCHIVED");
    expect(listAskReviewLocations({ accountId: account.account.accountId, status: "ARCHIVED" }).total).toBe(1);
  });

  it("renders the global footer without duplicate raw Infinity/IMR URLs", () => {
    const html = askReviewFooterHtml();
    expect(evaluateAskReviewFooterContract(html).result).toBe("PASS");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain("An Infinity OS Venture");
    expect(html).toContain("By IMR");
  });
});
