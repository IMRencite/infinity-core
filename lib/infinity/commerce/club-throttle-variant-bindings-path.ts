export const CLUB_THROTTLE_VARIANT_BINDINGS_REL =
  ".infinity/commerce/club-throttle-gelato-variant-bindings.json" as const;

export type GelatoVariantBinding = {
  sku: string;
  gelato_product_id: string;
  superseded_gelato_product_id: string;
  variants: Record<string, { variant_uid: string; color: string; size: string }>;
  /** Optional multi-color matrix when provider uses separate variant UIDs per garment color. */
  variants_by_color?: Record<
    string,
    Record<
      string,
      {
        variant_uid: string;
        order_product_uid?: string;
        gelato_product_id?: string;
        color: string;
        size: string;
      }
    >
  >;
};
