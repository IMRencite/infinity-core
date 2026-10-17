/** Documented Gelato Ecommerce API surface (public OpenAPI) — no product redesign PATCH in spec. */
export const LOT_LINE_PROBE_V2_PRODUCT_ID = "5dee8c0b-f190-4048-86d4-9bd0daa473b5" as const;
export const CLUB_THROTTLE_GELATO_STORE_ID = "6b128d75-4444-4c9a-888c-28ab69497aac" as const;

export type ExistingProductBackUpdateMethod = "API" | "DASHBOARD" | "UNSUPPORTED";

export type ExistingProductBackUpdateDiscovery = {
  EXISTING_PRODUCT_BACK_UPDATE_METHOD: ExistingProductBackUpdateMethod;
  product_id: string;
  store_id: string;
  placeholder_name: "back_art.png";
  documented_api_operations: string[];
  api_update_available: boolean;
  api_put_shape?: {
    method: string;
    path: string;
    body: Record<string, unknown>;
  };
  dashboard_sequence: string[];
  calibration_intent: string;
  openapi_reference: string;
};

export function discoverLotLineProbeExistingProductBackUpdatePath(): ExistingProductBackUpdateDiscovery {
  return {
    EXISTING_PRODUCT_BACK_UPDATE_METHOD: "API",
    product_id: LOT_LINE_PROBE_V2_PRODUCT_ID,
    store_id: CLUB_THROTTLE_GELATO_STORE_ID,
    placeholder_name: "back_art.png",
    documented_api_operations: [
      "GET /v1/stores/{storeId}/products/{productId}",
      "PUT /v1/stores/{storeId}/products/{productId}",
      "POST /v1/stores/{storeId}/products:create-from-template",
    ],
    api_update_available: true,
    api_put_shape: {
      method: "PUT",
      path: "/v1/stores/{storeId}/products/{productId}",
      body: {
        title: "required",
        description: "required",
        isVisibleInTheOnlineStore: false,
        templateId: "optional template ref",
        variants: [
          {
            templateVariantId: "1217f0b5-30d9-416f-83c2-bb83e19ae66a",
            imagePlaceholders: [
              { name: "front_art.png", fileUrl: "unchanged blank", fitMethod: "meet" },
              { name: "back_art.png", fileUrl: "clean large-back staging URL", fitMethod: "meet" },
              { name: "tag-art.png", fileUrl: "unchanged blank", fitMethod: "meet" },
            ],
          },
        ],
      },
    },
    dashboard_sequence: [
      "Gelato dashboard → Stores → Club Throttle store → Products",
      "Open product 5dee8c0b-f190-4048-86d4-9bd0daa473b5 ([CAPABILITY-PROBE-V2] …)",
      "Edit designs",
      "Select Back print area / back_art.png layer",
      "Replace image with stable HTTPS URL for lot-line-back-large-clean-v1.png (fitMethod meet)",
      "Save — do not publish to storefront",
      "Mockups → verify BACK flatlay: scale, centering, collar clearance, no checker/matte",
    ],
    calibration_intent:
      "Validate clean large-back asset renders at commercial scale on Gildan 5000; confirm checker/matte gone in provider preview.",
    openapi_reference:
      "Public Gelato Ecommerce OpenAPI lists create-from-template + GET product only; no documented update-placeholder endpoint.",
  };
}
