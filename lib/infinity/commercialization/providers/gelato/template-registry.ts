import { GELATO_PROVIDER_CAPABILITY } from "./capability";

export const GELATO_TEMPLATE_STATUSES = [
  "DISCOVERED",
  "UNDER_REVIEW",
  "APPROVED",
  "DEPRECATED",
  "UNAVAILABLE",
  "BLOCKED",
] as const;
export type GelatoTemplateStatus = (typeof GELATO_TEMPLATE_STATUSES)[number];

export type GelatoTemplateRecord = {
  venture_id: string;
  provider: "GELATO";
  store_id: string | null;
  template_id: string | null;
  provider_product_uid: string;
  product_family: string;
  garment: string;
  garment_name: string;
  blank: string;
  manufacturer: string;
  fit: string;
  material: string;
  materials: string;
  fabric_weight: string;
  colors: string[];
  sizes: string[];
  print_method: string;
  print_areas: Array<{ location: "front" | "back" | "sleeve"; width_in?: number; height_in?: number }>;
  front_placeholder: string | null;
  back_placeholder: string | null;
  other_placeholders: string[];
  placeholder_dimensions: Array<{ name: string; width_in?: number; height_in?: number }>;
  provider_preview: string | null;
  regional_availability: string | null;
  provider_cost: number | null;
  flat_mockups_supported: boolean;
  model_mockups_supported: boolean;
  available_mockup_types: string[];
  status: GelatoTemplateStatus;
  last_synced_at: string | null;
  catalog_api: true;
  mockup_api: typeof GELATO_PROVIDER_CAPABILITY.mockup_api;
};

const memory = new Map<string, GelatoTemplateRecord>();

export function gelatoReadOnlyCapability() {
  return {
    catalog_products: GELATO_PROVIDER_CAPABILITY.catalog_api,
    product_uids: true,
    variants: true,
    mockup_api: GELATO_PROVIDER_CAPABILITY.mockup_api,
    template_enumeration: "NOT_ACCOUNT_WIDE",
    sandbox_order_submission: "BLOCKED_UNTIL_COMPANY_PROFILE",
  };
}

export function upsertGelatoTemplate(record: GelatoTemplateRecord): GelatoTemplateRecord {
  memory.set(record.provider_product_uid, record);
  return record;
}

export function listGelatoTemplates(status?: GelatoTemplateStatus): GelatoTemplateRecord[] {
  return [...memory.values()].filter((row) => !status || row.status === status);
}

export function selectGelatoTemplate(input: {
  garment_intent?: string;
  placement?: string;
  approved_only?: boolean;
}): GelatoTemplateRecord | null {
  const rows = listGelatoTemplates(input.approved_only === false ? undefined : "APPROVED");
  return rows.find((row) => {
    if (input.garment_intent && !row.garment_name.toLowerCase().includes(input.garment_intent.toLowerCase())) return false;
    if (input.placement === "SMALL_FRONT_LARGE_BACK") {
      return row.print_areas.some((area) => area.location === "front") && row.print_areas.some((area) => area.location === "back");
    }
    return row.print_areas.some((area) => area.location === "front");
  }) ?? rows[0] ?? null;
}

export function seedClubThrottleCoreTeeTemplate(now = new Date().toISOString()): GelatoTemplateRecord {
  return upsertGelatoTemplate({
    venture_id: "club-throttle",
    provider: "GELATO",
    store_id: null,
    template_id: null,
    provider_product_uid: "gelato-gildan-5300",
    product_family: "unisex-tee",
    garment: "heavyweight tee",
    garment_name: "Gildan 5300 Heavy Cotton tee",
    blank: "Gildan 5300",
    manufacturer: "Gildan",
    fit: "classic unisex",
    material: "100% cotton",
    materials: "100% cotton",
    fabric_weight: "5.4 oz/yd²",
    colors: ["black"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    print_method: "dtg",
    print_areas: [
      { location: "front", width_in: 12, height_in: 16 },
      { location: "back", width_in: 12, height_in: 16 },
    ],
    front_placeholder: null,
    back_placeholder: null,
    other_placeholders: [],
    placeholder_dimensions: [
      { name: "front", width_in: 12, height_in: 16 },
      { name: "back", width_in: 12, height_in: 16 },
    ],
    provider_preview: null,
    regional_availability: null,
    provider_cost: null,
    flat_mockups_supported: false,
    model_mockups_supported: false,
    available_mockup_types: [],
    status: "UNDER_REVIEW",
    last_synced_at: now,
    catalog_api: true,
    mockup_api: GELATO_PROVIDER_CAPABILITY.mockup_api,
  });
}

export function gelatoTemplateCreationPath(): {
  create_by_api: false;
  retrieve_by_id: true;
  enumerate_account_wide: false;
  dashboard_required: true;
} {
  return {
    create_by_api: false,
    retrieve_by_id: true,
    enumerate_account_wide: false,
    dashboard_required: true,
  };
}
