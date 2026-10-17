/**
 * Gelato product readiness uses three evidence tracks — never collapse into API-only QC.
 *
 * API_PRODUCT_STATE: GET /v1/stores/{storeId}/products/{productId}
 * PROVIDER_DASHBOARD_STATE: founder-verified Gelato dashboard (variants, thumbnails)
 * PROVIDER_RENDER_STATE: observable provider renders (front/back), not local composites
 */

export type GelatoEvidenceTrack = "API_PRODUCT_STATE" | "PROVIDER_DASHBOARD_STATE" | "PROVIDER_RENDER_STATE";

export type ApiProductStateSnapshot = {
  status: string | null;
  variant_count: number;
  previewUrl: string | null;
  productImages_count: number;
};

export type ProviderDashboardStateEvidence = {
  source: "founder_gelato_dashboard";
  product_exists: boolean;
  variant_exists: boolean;
  variant_label: string | null;
  product_thumbnail_provider_garment: boolean;
  variant_thumbnail_provider_garment: boolean;
  primary_scene: "front" | "back" | "unknown";
};

export type MockupGenerationQcInput = {
  api: ApiProductStateSnapshot;
  dashboard: ProviderDashboardStateEvidence | null;
  /** When front placeholder was intentionally transparent blank PNG. */
  primary_front_artwork_expected: "NONE_EXPECTED" | "ARTWORK_EXPECTED";
};

export type GelatoMockupGenerationClassification = {
  API_PRODUCT_MOCKUP_SIGNAL: "YES" | "NO";
  DASHBOARD_PRODUCT_MOCKUP_GENERATED: "YES" | "NO" | "UNKNOWN";
  MOCKUP_GENERATION_QC: "PASS" | "FAIL" | "UNKNOWN";
  MOCKUP_GENERATION_QC_basis: GelatoEvidenceTrack[];
  API_DASHBOARD_VARIANT_PARITY: "PASS" | "FAIL" | "UNKNOWN";
  API_DASHBOARD_MOCKUP_PARITY: "PASS" | "FAIL" | "UNKNOWN";
  rule: string;
};

export function classifyGelatoMockupGenerationQc(input: MockupGenerationQcInput): GelatoMockupGenerationClassification {
  const apiMockup =
    Boolean(input.api.previewUrl) || input.api.productImages_count > 0 ? "YES" : ("NO" as const);
  const dashMockup =
    input.dashboard?.product_thumbnail_provider_garment && input.dashboard.variant_thumbnail_provider_garment
      ? "YES"
      : input.dashboard
        ? "NO"
        : "UNKNOWN";

  let MOCKUP_GENERATION_QC: "PASS" | "FAIL" | "UNKNOWN" = "UNKNOWN";
  const basis: GelatoEvidenceTrack[] = [];
  if (dashMockup === "YES") {
    MOCKUP_GENERATION_QC = "PASS";
    basis.push("PROVIDER_DASHBOARD_STATE");
  } else if (apiMockup === "YES") {
    MOCKUP_GENERATION_QC = "PASS";
    basis.push("API_PRODUCT_STATE");
  } else if (dashMockup === "NO" && apiMockup === "NO") {
    MOCKUP_GENERATION_QC = "FAIL";
    basis.push("API_PRODUCT_STATE", "PROVIDER_DASHBOARD_STATE");
  }

  const apiVariants = input.api.variant_count;
  let API_DASHBOARD_VARIANT_PARITY: "PASS" | "FAIL" | "UNKNOWN" = "UNKNOWN";
  if (input.dashboard) {
    const apiHasVariant = apiVariants > 0;
    const dashHasVariant = input.dashboard.variant_exists;
    API_DASHBOARD_VARIANT_PARITY = apiHasVariant === dashHasVariant ? "PASS" : "FAIL";
  }

  let API_DASHBOARD_MOCKUP_PARITY: "PASS" | "FAIL" | "UNKNOWN" = "UNKNOWN";
  if (input.dashboard) {
    const apiHasMockup = apiMockup === "YES";
    const dashHasMockup = dashMockup === "YES";
    API_DASHBOARD_MOCKUP_PARITY = apiHasMockup === dashHasMockup ? "PASS" : "FAIL";
  }

  return {
    API_PRODUCT_MOCKUP_SIGNAL: apiMockup,
    DASHBOARD_PRODUCT_MOCKUP_GENERATED: dashMockup,
    MOCKUP_GENERATION_QC,
    MOCKUP_GENERATION_QC_basis: basis,
    API_DASHBOARD_VARIANT_PARITY,
    API_DASHBOARD_MOCKUP_PARITY,
    rule:
      "Do not declare mockup-generation FAIL solely on API null media when dashboard shows provider garment thumbnails; use GELATO_ASYNC_PRODUCT_READINESS_QC for timed API polls — dashboard existence alone does not prove back view.",
  };
}

export type ProbeV2DashboardReconciliation = {
  product_id: string;
  product_title: string;
  PRODUCT_RECORD_QC: "PASS" | "FAIL";
  VARIANT_CREATION_QC: "PASS" | "FAIL" | "UNKNOWN";
  VARIANT_CREATION_QC_basis: GelatoEvidenceTrack[];
  DASHBOARD_PRODUCT_MOCKUP_GENERATED: "YES" | "NO" | "UNKNOWN";
  MOCKUP_GENERATION_QC: "PASS" | "FAIL" | "UNKNOWN";
  PRIMARY_PROVIDER_RENDER: "FRONT" | "BACK" | "UNKNOWN";
  PRIMARY_PROVIDER_RENDER_ARTWORK: "NONE_EXPECTED" | "ARTWORK_EXPECTED" | "UNKNOWN";
  BACK_PROVIDER_RENDER_OBSERVED: "YES" | "NO" | "NOT_YET" | "UNKNOWN";
  /** Never infer NO from API-only absence — use UNKNOWN + discovery path. */
  BACK_RENDER_CAPABILITY: "YES" | "UNKNOWN";
  API_BACK_RENDER_EXPOSED?: "YES" | "NO";
  PROVIDER_BACK_RENDER_QC?: "PASS" | "BLOCKED" | "UNKNOWN";
  BACK_RENDER_DISCOVERY_REQUIRED?: "YES" | "NO";
  BACK_RENDER_DISCOVERY_PATH?: "EXISTING_PRODUCT_DASHBOARD_INSPECTION" | null;
  API_DASHBOARD_VARIANT_PARITY: "PASS" | "FAIL" | "UNKNOWN";
  API_DASHBOARD_MOCKUP_PARITY: "PASS" | "FAIL" | "UNKNOWN";
  evidence_tracks: {
    API_PRODUCT_STATE: ApiProductStateSnapshot & { polled_at: string };
    API_PRODUCT_STATE_at_probe_observation_end?: ApiProductStateSnapshot & { reference?: string };
    API_PRODUCT_STATE_at_reconciliation_read?: ApiProductStateSnapshot & {
      polled_at?: string;
      read_only_get_http?: number;
      note?: string;
    };
    PROVIDER_DASHBOARD_STATE: ProviderDashboardStateEvidence & { verified_at: string; notes: string[] };
    PROVIDER_RENDER_STATE: {
      back_capture_pending: "founder_edit_designs_or_mockups_viewer";
      back_render_saved: "YES" | "NO";
    };
  };
  parity_current_read?: GelatoMockupGenerationClassification;
  review: {
    FRONT_PRODUCT_VISUAL_QC: "PASS" | "BLOCKED" | "FAIL";
    BACK_PRODUCT_VISUAL_QC: "BLOCKED" | "PASS" | "FAIL";
    PRODUCT_VISUAL_QC: "BLOCKED" | "PASS" | "FAIL";
    PROVIDER_FINAL_MOCKUP_QC: "NOT_RUN" | "PASS" | "FAIL";
    CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING" | "APPROVED";
  };
  GELATO_WRITE_CALLS: 0;
};

export function buildProbeV2FounderDashboardReconciliation(input: {
  api: ApiProductStateSnapshot;
  polled_at: string;
}): ProbeV2DashboardReconciliation {
  const dashboard: ProviderDashboardStateEvidence = {
    source: "founder_gelato_dashboard",
    product_exists: true,
    variant_exists: true,
    variant_label: "White / M — Gildan 5000",
    product_thumbnail_provider_garment: true,
    variant_thumbnail_provider_garment: true,
    primary_scene: "front",
  };

  const mockup = classifyGelatoMockupGenerationQc({
    api: input.api,
    dashboard,
    primary_front_artwork_expected: "NONE_EXPECTED",
  });

  return {
    product_id: "5dee8c0b-f190-4048-86d4-9bd0daa473b5",
    product_title: "[CAPABILITY-PROBE-V2] Club Throttle Lot Line Tee — mockup QC",
    PRODUCT_RECORD_QC: "PASS",
    VARIANT_CREATION_QC: "PASS",
    VARIANT_CREATION_QC_basis: ["PROVIDER_DASHBOARD_STATE"],
    DASHBOARD_PRODUCT_MOCKUP_GENERATED: mockup.DASHBOARD_PRODUCT_MOCKUP_GENERATED,
    MOCKUP_GENERATION_QC: mockup.MOCKUP_GENERATION_QC,
    PRIMARY_PROVIDER_RENDER: "FRONT",
    PRIMARY_PROVIDER_RENDER_ARTWORK: "NONE_EXPECTED",
    BACK_PROVIDER_RENDER_OBSERVED: "NOT_YET",
    BACK_RENDER_CAPABILITY: "UNKNOWN",
    API_DASHBOARD_VARIANT_PARITY: mockup.API_DASHBOARD_VARIANT_PARITY,
    API_DASHBOARD_MOCKUP_PARITY: mockup.API_DASHBOARD_MOCKUP_PARITY,
    evidence_tracks: {
      API_PRODUCT_STATE: { ...input.api, polled_at: input.polled_at },
      PROVIDER_DASHBOARD_STATE: {
        ...dashboard,
        verified_at: new Date().toISOString(),
        notes: [
          "Blank white front garment expected — front_art.png was 1x1 transparent PNG in probe #2",
          "Real white Gildan 5000 product + variant thumbnails observed in Gelato dashboard",
        ],
      },
      PROVIDER_RENDER_STATE: {
        back_capture_pending: "founder_edit_designs_or_mockups_viewer",
        back_render_saved: "NO",
      },
    },
    review: {
      FRONT_PRODUCT_VISUAL_QC: "PASS",
      BACK_PRODUCT_VISUAL_QC: "BLOCKED",
      PRODUCT_VISUAL_QC: "BLOCKED",
      PROVIDER_FINAL_MOCKUP_QC: "NOT_RUN",
      CT_LOT_LINE_1_FOUNDER_REVIEW: "PENDING",
    },
    GELATO_WRITE_CALLS: 0,
  };
}
