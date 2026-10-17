import { gelatoSafeRequest } from "./account-capacity";
import { upsertGelatoTemplate, type GelatoTemplateRecord } from "./template-registry";
import { clubThrottleGelatoStoreId } from "./venture-store-resolve";

export const GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID = "c8d24156-5370-402e-a671-303d008b16a4" as const;
export const GELATO_OVERSIZED_HOODIE_TEMPLATE_ID = "928ad2d0-fbc3-4243-9e42-68b1451c6827" as const;

/** Runtime store id from registry/env, or null if not provisioned. */
export function getClubThrottleGelatoStoreId(): string | null {
  return clubThrottleGelatoStoreId();
}

/** Legacy sentinel when no store is bound (compile-time guards / tests). */
export const GELATO_STORE_ID_PENDING = "PENDING_FOUNDER" as const;

/** @deprecated Prefer getClubThrottleGelatoStoreId() — returns bound id or PENDING sentinel string. */
export function gelatoStoreIdOrPending(): string {
  return getClubThrottleGelatoStoreId() ?? GELATO_STORE_ID_PENDING;
}

export type FounderTemplateValidation = {
  template_id: string;
  garment: "T_SHIRT" | "HOODIE";
  status: "PENDING_PROVIDER_VALIDATION" | "APPROVED_TEMPLATE" | "FAIL";
  exists: boolean;
  product_family?: string;
  colors?: string[];
  sizes?: string[];
  front_art: "CONFIRMED" | "MISSING" | "UNPROVEN";
  back_art: "CONFIRMED" | "MISSING" | "UNPROVEN";
  http_status: number;
};

function registerPending(input: {
  template_id: string;
  garment: string;
  garment_name: string;
  product_family: string;
}): GelatoTemplateRecord {
  return upsertGelatoTemplate({
    venture_id: "club-throttle",
    provider: "GELATO",
    store_id: null,
    template_id: input.template_id,
    provider_product_uid: `gelato-template-${input.template_id}`,
    product_family: input.product_family,
    garment: input.garment,
    garment_name: input.garment_name,
    blank: input.garment_name,
    manufacturer: "UNKNOWN_PENDING_PROVIDER",
    fit: "UNKNOWN_PENDING_PROVIDER",
    material: "UNKNOWN_PENDING_PROVIDER",
    materials: "UNKNOWN_PENDING_PROVIDER",
    fabric_weight: "UNKNOWN_PENDING_PROVIDER",
    colors: [],
    sizes: [],
    print_method: "dtg",
    print_areas: [
      { location: "front" },
      { location: "back" },
    ],
    front_placeholder: "front_art",
    back_placeholder: "back_art",
    other_placeholders: [],
    placeholder_dimensions: [],
    provider_preview: null,
    regional_availability: null,
    provider_cost: null,
    flat_mockups_supported: false,
    model_mockups_supported: false,
    available_mockup_types: [],
    status: "UNDER_REVIEW",
    last_synced_at: new Date().toISOString(),
    catalog_api: true,
    mockup_api: "UNSUPPORTED",
  });
}

export function registerFounderGelatoTemplates() {
  return {
    tee: registerPending({
      template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
      garment: "heavyweight tee",
      garment_name: "Heavyweight Tee",
      product_family: "T_SHIRT",
    }),
    hoodie: registerPending({
      template_id: GELATO_OVERSIZED_HOODIE_TEMPLATE_ID,
      garment: "oversized hoodie",
      garment_name: "Oversized Hoodie",
      product_family: "HOODIE",
    }),
    store_id: getClubThrottleGelatoStoreId(),
  };
}

function placeholdersFrom(probe: { top_keys: string[] }): { front_art: FounderTemplateValidation["front_art"]; back_art: FounderTemplateValidation["back_art"] } {
  const blob = probe.top_keys.join(" ").toLowerCase();
  const front = /front/.test(blob) ? "CONFIRMED" : "UNPROVEN";
  const back = /back/.test(blob) ? "CONFIRMED" : "UNPROVEN";
  return { front_art: front, back_art: back };
}

export async function validateFounderGelatoTemplate(templateId: string, garment: "T_SHIRT" | "HOODIE"): Promise<FounderTemplateValidation> {
  const probe = await gelatoSafeRequest({ path: `/v1/templates/${templateId}` });
  const exists = probe.status === 200;
  const arts = placeholdersFrom(probe);
  return {
    template_id: templateId,
    garment,
    status: exists ? "APPROVED_TEMPLATE" : probe.status === 0 ? "PENDING_PROVIDER_VALIDATION" : "FAIL",
    exists,
    front_art: exists ? arts.front_art : "UNPROVEN",
    back_art: exists ? arts.back_art : "UNPROVEN",
    http_status: probe.status,
  };
}

export async function validateFounderGelatoTemplates() {
  registerFounderGelatoTemplates();
  const tee = await validateFounderGelatoTemplate(GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID, "T_SHIRT");
  const hoodie = await validateFounderGelatoTemplate(GELATO_OVERSIZED_HOODIE_TEMPLATE_ID, "HOODIE");
  return { tee, hoodie, store_id: getClubThrottleGelatoStoreId() };
}
