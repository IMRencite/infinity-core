export const OCCUPANCYNPV_BRAND_NAVY = "#1d4e78" as const;
export const OCCUPANCYNPV_BRAND_NAVY_DEEP = "#14385a" as const;
export const OCCUPANCYNPV_BRAND_PAPER = "#f4f6f8" as const;
export const OCCUPANCYNPV_BRAND_INK = "#152033" as const;
export const OCCUPANCYNPV_BRAND_WHITE = "#ffffff" as const;

/** Compact geometric O: navy field, thick white ring. No embedded text. */
export function occupancynpvCompactMarkSvg(input: {
  variant?: "light" | "dark";
  size?: number;
} = {}): string {
  const size = input.size ?? 32;
  const dark = input.variant === "dark";
  const field = dark ? OCCUPANCYNPV_BRAND_WHITE : OCCUPANCYNPV_BRAND_NAVY;
  const ring = dark ? OCCUPANCYNPV_BRAND_NAVY : OCCUPANCYNPV_BRAND_WHITE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="${field}"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="${ring}" stroke-width="4.5"/>
</svg>`;
}

export function occupancynpvPrimaryLogoSvg(input: {
  variant?: "light" | "dark";
  markSize?: number;
} = {}): string {
  const mark = occupancynpvCompactMarkSvg({ variant: input.variant ?? "light", size: input.markSize ?? 28 });
  const word = input.variant === "dark" ? OCCUPANCYNPV_BRAND_WHITE : OCCUPANCYNPV_BRAND_INK;
  return `<span class="onpv-brand" data-venture-logo="primary" data-logo-variant="${input.variant ?? "light"}">${mark}<span class="onpv-brand-wordmark" data-venture-wordmark="true" style="color:${word}">OccupancyNPV</span></span>`;
}

export const OCCUPANCYNPV_COMPACT_MARK_LIGHT = occupancynpvCompactMarkSvg({ variant: "light" });
export const OCCUPANCYNPV_COMPACT_MARK_DARK = occupancynpvCompactMarkSvg({ variant: "dark" });

export const OCCUPANCYNPV_BRAND_CSS = `
.onpv-brand, .pv-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
  color: inherit;
}
.pv-nav-logo, .onpv-brand-mark {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 1.75rem;
}
.pv-nav-logo svg, .onpv-brand svg, .onpv-brand-mark svg {
  display: block;
  width: 100%;
  height: 100%;
}
.pv-nav-wordmark, .onpv-brand-wordmark {
  white-space: nowrap;
  line-height: 1;
}
@media (max-width: 420px) {
  .pv-nav-wordmark, .onpv-brand-wordmark { font-size: 0.95rem; }
}
`;

export function applyOccupancynpvBrandCss(existing: string): string {
  if (existing.includes("data-venture-logo") && existing.includes(".pv-nav-logo")) return existing;
  if (existing.includes(".pv-nav-logo {")) return existing;
  return `${existing}\n${OCCUPANCYNPV_BRAND_CSS}\n`;
}
