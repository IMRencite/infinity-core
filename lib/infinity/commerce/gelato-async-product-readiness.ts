import type { ApiProductStateSnapshot } from "./gelato-product-readiness-evidence";

/** Empirical Gelato Ecommerce async processing — probe #2 showed ~15m insufficient. */
export type GelatoAsyncProductReadinessQc =
  | "CREATED_PENDING"
  | "PROCESSING"
  | "ACTIVE_WITH_MEDIA"
  | "PROCESSING_TIMEOUT"
  | "PROVIDER_ERROR";

export const GELATO_ASYNC_POLL_BACKOFF_MS = [
  0, 30_000, 60_000, 120_000, 180_000, 300_000, 600_000, 900_000, 1_200_000, 1_800_000, 2_700_000,
] as const;

/** Do not treat mockup generation as failed inside this window without other error signals. */
export const GELATO_ASYNC_OBSERVATION_WINDOW_MS = 45 * 60_000;

export type GelatoAsyncReadinessClassification = {
  GELATO_ASYNC_PRODUCT_READINESS_QC: GelatoAsyncProductReadinessQc;
  has_media: boolean;
  mockup_qc_fail_premature: boolean;
  rule: string;
  recommended_poll_backoff_ms: readonly number[];
};

export function classifyGelatoAsyncProductReadiness(
  api: ApiProductStateSnapshot,
  options: { elapsed_ms_since_create?: number; publishing_error?: string | null } = {},
): GelatoAsyncReadinessClassification {
  const status = (api.status ?? "").toLowerCase();
  const hasMedia = Boolean(api.previewUrl) || api.productImages_count > 0;
  const elapsed = options.elapsed_ms_since_create ?? 0;
  const pubErr = options.publishing_error?.trim();

  if (pubErr) {
    return {
      GELATO_ASYNC_PRODUCT_READINESS_QC: "PROVIDER_ERROR",
      has_media: hasMedia,
      mockup_qc_fail_premature: false,
      rule: "Provider publishing error — investigate before retrying create.",
      recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
    };
  }

  if ((status === "active" || status === "published") && hasMedia) {
    return {
      GELATO_ASYNC_PRODUCT_READINESS_QC: "ACTIVE_WITH_MEDIA",
      has_media: true,
      mockup_qc_fail_premature: false,
      rule: "Product active with provider media — safe to run provider-render QC.",
      recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
    };
  }

  if ((status === "active" || status === "published") && !hasMedia) {
    return {
      GELATO_ASYNC_PRODUCT_READINESS_QC: "PROCESSING",
      has_media: false,
      mockup_qc_fail_premature: true,
      rule: "Active status without media yet — continue read-only polling; do not create replacement product.",
      recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
    };
  }

  if (status === "created" && !hasMedia) {
    if (elapsed >= GELATO_ASYNC_OBSERVATION_WINDOW_MS) {
      return {
        GELATO_ASYNC_PRODUCT_READINESS_QC: "PROCESSING_TIMEOUT",
        has_media: false,
        mockup_qc_fail_premature: false,
        rule: "Still created without media after observation window — escalate, still no replacement write without founder gate.",
        recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
      };
    }
    return {
      GELATO_ASYNC_PRODUCT_READINESS_QC: elapsed < 120_000 ? "CREATED_PENDING" : "PROCESSING",
      has_media: false,
      mockup_qc_fail_premature: true,
      rule: "Do not hard-fail mockup generation solely because API media is absent within async window.",
      recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
    };
  }

  if (status === "failed") {
    return {
      GELATO_ASYNC_PRODUCT_READINESS_QC: "PROVIDER_ERROR",
      has_media: hasMedia,
      mockup_qc_fail_premature: false,
      rule: "Product status failed.",
      recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
    };
  }

  return {
    GELATO_ASYNC_PRODUCT_READINESS_QC: "PROCESSING",
    has_media: hasMedia,
    mockup_qc_fail_premature: !hasMedia,
    rule: "Unknown intermediate state — prefer read-only polling over new creates.",
    recommended_poll_backoff_ms: GELATO_ASYNC_POLL_BACKOFF_MS,
  };
}
