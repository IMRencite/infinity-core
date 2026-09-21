import { buildRequestCopy, buildRequestCopyVariants } from "./copy";
import { generateQrSvg } from "./qr";
import type { AskReviewLocationInputError } from "./types";

const TYPED_PLACE_ID = /^(ChIJ|GhIJ|EkIJ|EhIJ)[A-Za-z0-9_-]{16,}$/;
const EXTRACTED_PLACE_ID = /^[A-Za-z0-9_-]{16,255}$/;
const SHORT_OR_UNRESOLVED = /(?:maps\.app\.goo\.gl|goo\.gl\/maps)\b/i;
const WRITE_REVIEW_HOST = /search\.google\.com\/local\/writereview/i;
const GPAGE_REVIEW = /^https:\/\/g\.page\/r\/[A-Za-z0-9_-]+\/review\/?$/i;
const MAPS_HOST = /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|g\.page)\//i;

export function canonicalizeReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function extractPlaceId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (TYPED_PLACE_ID.test(trimmed)) return trimmed;
  try {
    const decoded = decodeURIComponent(trimmed);
    const query = decoded.match(/[?&#](?:place_id|query_place_id|placeid)=([^&#]+)/i);
    if (query?.[1] && EXTRACTED_PLACE_ID.test(query[1])) return query[1];
    const encoded = decoded.match(/!1s((?:ChIJ|GhIJ|EkIJ|EhIJ)[A-Za-z0-9_-]+)/);
    if (encoded?.[1] && TYPED_PLACE_ID.test(encoded[1])) return encoded[1];
  } catch {
    return null;
  }
  return null;
}

export function normalizeReviewTarget(input: {
  placeId?: string | null;
  mapsUrl?: string | null;
}):
  | { ok: true; placeId: string | null; mapsUrl: string | null; reviewUrl: string }
  | { ok: false; reason: AskReviewLocationInputError } {
  const placeIdRaw = input.placeId?.trim() || null;
  const mapsUrl = input.mapsUrl?.trim() || null;
  const fromPlaceField = placeIdRaw ? extractPlaceId(placeIdRaw) : null;
  if (fromPlaceField) {
    return { ok: true, placeId: fromPlaceField, mapsUrl, reviewUrl: canonicalizeReviewUrl(fromPlaceField) };
  }
  if (mapsUrl) {
    if (SHORT_OR_UNRESOLVED.test(mapsUrl)) {
      return { ok: false, reason: "UNSUPPORTED_MAPS_URL" };
    }
    if (WRITE_REVIEW_HOST.test(mapsUrl)) {
      const extracted = extractPlaceId(mapsUrl);
      if (!extracted) return { ok: false, reason: "INVALID_LOCATION_INPUT" };
      return { ok: true, placeId: extracted, mapsUrl, reviewUrl: canonicalizeReviewUrl(extracted) };
    }
    if (GPAGE_REVIEW.test(mapsUrl)) {
      return { ok: true, placeId: null, mapsUrl, reviewUrl: mapsUrl.replace(/\/$/, "") };
    }
    const extracted = extractPlaceId(mapsUrl);
    if (extracted) {
      return { ok: true, placeId: extracted, mapsUrl, reviewUrl: canonicalizeReviewUrl(extracted) };
    }
    if (MAPS_HOST.test(mapsUrl)) {
      return { ok: false, reason: "UNSUPPORTED_MAPS_URL" };
    }
    return { ok: false, reason: "INVALID_LOCATION_INPUT" };
  }
  return { ok: false, reason: "INVALID_LOCATION_INPUT" };
}

export function generateReviewKit(input: {
  businessName: string;
  placeId?: string | null;
  mapsUrl?: string | null;
}):
  | { ok: true; reviewUrl: string; requestCopy: string; copyVariants: ReturnType<typeof buildRequestCopyVariants>; qrSvg: string }
  | { ok: false; reason: AskReviewLocationInputError } {
  const target = normalizeReviewTarget(input);
  if (!target.ok) return target;
  const copyVariants = buildRequestCopyVariants(input.businessName, target.reviewUrl);
  return {
    ok: true,
    reviewUrl: target.reviewUrl,
    requestCopy: buildRequestCopy(input.businessName, target.reviewUrl),
    copyVariants,
    qrSvg: generateQrSvg(target.reviewUrl),
  };
}
