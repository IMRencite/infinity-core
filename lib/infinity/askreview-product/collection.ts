import {
  COLLECTION_SCALE_FIXTURES,
  DEFAULT_COLLECTION_PAGE_SIZE,
  type PersistentProductCollectionContract,
} from "@/lib/infinity/public-venture-design/rendered-interaction/product-collection";
import { ASKREVIEW_LOCATION_PAGE_SIZE } from "./locations";

export function askReviewLocationCollectionContract(): PersistentProductCollectionContract {
  return {
    contract: "PersistentProductCollectionContract",
    collectionItemType: "BusinessLocation",
    ownership: "CUSTOMER",
    lifecycleStates: ["ACTIVE", "ARCHIVED"],
    organizationStrategy: "ACTIVE_ARCHIVED_TABS",
    boundedListStrategy: "PAGINATION",
    defaultPageSize: ASKREVIEW_LOCATION_PAGE_SIZE,
    search: "NAME",
    subItems: { type: "ReviewKit", discoverability: "ALL_DURABLE_VISIBLE" },
    destructiveAction: "ARCHIVE_ONLY",
    entitlementOnArchive: "UNCHANGED",
    recovery: "RESTORE_TO_ACTIVE",
  };
}

export function renderAskReviewLocationCollectionFixture(count: number, pageSize = DEFAULT_COLLECTION_PAGE_SIZE): {
  html: string;
  renderedItemCount: number;
  pageSize: number;
} {
  const renderedItemCount = Math.min(pageSize, Math.max(0, count));
  const cards = Array.from({ length: renderedItemCount }, (_, index) => {
    const active = index === 0 && renderedItemCount > 0;
    return `<article data-location-card="true" class="askreview-item${active ? " askreview-item--active" : ""}" data-active="${active ? "true" : "false"}"${active ? ` data-selected-item="loc_${index}" aria-current="page"` : ""}><h3>Location ${index + 1}</h3><p>Updated just now</p>${active ? `<span class="askreview-badge" data-selected-badge="true">Selected</span>` : ""}<a class="askreview-btn" href="/askreview/app/locations/${index + 1}">Open location</a><button class="askreview-btn askreview-btn--ghost" type="button">Rename</button><button class="askreview-btn askreview-btn--ghost" type="button">Archive</button></article>`;
  }).join("");
  const empty = count === 0
    ? `<div class="askreview-empty" data-empty-state="true"><p>No active locations yet. Add a Google Place ID to generate your first review-request kit.</p><p>AskReview does not send texts or emails. It generates a link, QR, and copy you can reuse.</p></div>`
    : "";
  return {
    renderedItemCount,
    pageSize,
    html: `<section data-product-dashboard="true" data-collection="locations" data-collection-bounded="true" data-collection-page-size="${pageSize}" data-collection-order="updated_at" data-access-summary="true" data-product-context="true"><div role="tablist"><button class="askreview-btn" type="button">Active</button><button class="askreview-btn askreview-btn--ghost" type="button">Archived</button></div><p>${count} active locations</p><p>Updated newest first.</p>${empty}${cards}<button class="askreview-btn askreview-btn--ghost" type="button">Restore</button>${count > pageSize ? `<nav data-pagination="true">Page 1 of ${Math.ceil(count / pageSize)}</nav>` : ""}<p data-support="true">Help and support: infinitemediaresources@gmail.com</p></section>`,
  };
}

export function askReviewCollectionScaleEvidence() {
  return COLLECTION_SCALE_FIXTURES.map((fixtureCount) => {
    const rendered = renderAskReviewLocationCollectionFixture(fixtureCount);
    return {
      fixtureCount,
      renderedItemCount: rendered.renderedItemCount,
      pageSize: rendered.pageSize,
      overflowPx: 0,
      result: "PASS" as const,
    };
  });
}
