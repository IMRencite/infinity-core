/** Gildan 5000 Gelato template imagePlaceholder print areas (mm) — White/M probe variant. */
export const GELATO_GILDAN_5000_TEMPLATE_ID = "c8d24156-5370-402e-a671-303d008b16a4" as const;
export const GELATO_GILDAN_5000_WHITE_M_VARIANT_ID = "1217f0b5-30d9-416f-83c2-bb83e19ae66a" as const;

export const GELATO_GILDAN_5000_FRONT_PRINT_AREA_MM = { width: 274.5, height: 274.5 } as const;
export const GELATO_GILDAN_5000_TAG_PRINT_AREA_MM = { width: 35, height: 35 } as const;
export const GELATO_GILDAN_5000_BACK_PRINT_AREA_MM = { width: 273, height: 273 } as const;

export const GELATO_PLACEHOLDER_TARGET_DPI = 300;

export function printAreaCanvasPxAtDpi(
  mm: { width: number; height: number },
  dpi = GELATO_PLACEHOLDER_TARGET_DPI,
): { width: number; height: number } {
  return {
    width: Math.round((mm.width / 25.4) * dpi),
    height: Math.round((mm.height / 25.4) * dpi),
  };
}
