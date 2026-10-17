export const VENTURE_SPECIFIC_CHECKOUT_BRANDING_V1 = "VENTURE_SPECIFIC_CHECKOUT_BRANDING_V1" as const;
export const FIRST_PARTY_EMBEDDED_CHECKOUT_STANDARD_V1 = "FIRST_PARTY_EMBEDDED_CHECKOUT_STANDARD_V1" as const;

/** Store OS: venture trust branding is compact; payment UI is the primary surface. */
export const VENTURE_CHECKOUT_BRAND_PRESENTATION_V1 = "COMPACT" as const;
export const VENTURE_CHECKOUT_COMPOSITION_RULE_V1 = {
  brand_identity: "COMPACT" as const,
  payment_experience: "PRIMARY" as const,
  forbid_hero_sized_checkout_logo: true,
  desktop_preferred_layout: "ORDER_SUMMARY_LEFT_PAYMENT_RIGHT" as const,
} as const;

export const IMR_LEGAL_PAYMENT_ENTITY = "Infinite Media Resources LLC" as const;

export type VentureCheckoutBrandProfile = {
  venture_id: string;
  venture_name: string;
  checkout_display_name: string;
  legal_operator: typeof IMR_LEGAL_PAYMENT_ENTITY;
  checkout_path: string;
  public_origin: string;
  logo_path: string;
};

export const CLUB_THROTTLE_CHECKOUT_BRAND: VentureCheckoutBrandProfile = {
  venture_id: "club-throttle",
  venture_name: "Club Throttle",
  checkout_display_name: "Club Throttle by IMR",
  legal_operator: IMR_LEGAL_PAYMENT_ENTITY,
  checkout_path: "/checkout",
  public_origin: "https://clubthrottle.com",
  logo_path: "/brand/club-throttle/logo-primary.png",
};
