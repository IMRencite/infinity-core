/**
 * Deterministic local garment bases for founder mockups (v3 flat-lay silhouettes).
 * Print zones mapped from Gelato founder templates (READ-ONLY — no product create):
 * - Tee: c8d24156-5370-402e-a671-303d008b16a4
 * - Hoodie: 928ad2d0-fbc3-4243-9e42-68b1451c6827
 * Provider flat/mockup API: UNSUPPORTED without product creation — no cached Gelato garment PNG in repo.
 */

import {
  GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
  GELATO_OVERSIZED_HOODIE_TEMPLATE_ID,
} from "@/lib/infinity/commercialization/providers/gelato/founder-templates";

/** Internal placement math only — NOT Gelato garment imagery. */
export const LOCAL_PLACEMENT_REFERENCE = {
  id: "local_deterministic_garment_flatlay_v3",
  asset_class: "LOCAL_PLACEMENT_REFERENCE" as const,
  gelato_tee_template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
  gelato_hoodie_template_id: GELATO_OVERSIZED_HOODIE_TEMPLATE_ID,
  note: "Schematic flat-lay SVG mapped to Gelato print-placeholder mm zones. Not provider product photo or provider mockup.",
} as const;

/** @deprecated Use LOCAL_PLACEMENT_REFERENCE — do not describe as real garment / Gelato mockup */
export const FOUNDER_MOCKUP_TEMPLATE_SOURCE = {
  tee_template_id: GELATO_HEAVYWEIGHT_TEE_TEMPLATE_ID,
  hoodie_template_id: GELATO_OVERSIZED_HOODIE_TEMPLATE_ID,
  method: LOCAL_PLACEMENT_REFERENCE.id,
  asset_class: LOCAL_PLACEMENT_REFERENCE.asset_class,
  gelato_preview_api_used: false,
  resolution: LOCAL_PLACEMENT_REFERENCE,
} as const;

export type MockupView = "tee-front" | "tee-back" | "hoodie-front" | "hoodie-back";

export type PrintZone = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GarmentMockupLayout = {
  canvas: number;
  view: MockupView;
  /** Normalized 0–1 print area on canvas */
  printZone: PrintZone;
};

const C = 2000;

function pct(n: number): number {
  return n / C;
}

const TEE_BACK_ZONE: PrintZone = { left: pct(520), top: pct(420), width: pct(960), height: pct(980) };
/** Wearer's left chest → right side of flat-lay front image */
const TEE_FRONT_CHEST: PrintZone = { left: pct(980), top: pct(460), width: pct(300), height: pct(250) };
const HOODIE_BACK_ZONE: PrintZone = { left: pct(500), top: pct(520), width: pct(1000), height: pct(920) };
const HOODIE_FRONT_CHEST: PrintZone = { left: pct(960), top: pct(540), width: pct(320), height: pct(270) };

export function garmentMockupLayout(view: MockupView): GarmentMockupLayout {
  switch (view) {
    case "tee-back":
      return { canvas: C, view, printZone: TEE_BACK_ZONE };
    case "tee-front":
      return { canvas: C, view, printZone: TEE_FRONT_CHEST };
    case "hoodie-back":
      return { canvas: C, view, printZone: HOODIE_BACK_ZONE };
    case "hoodie-front":
      return { canvas: C, view, printZone: HOODIE_FRONT_CHEST };
  }
}

function roomBg(): string {
  return `<defs>
    <linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#222228"/><stop offset="100%" stop-color="#101014"/></linearGradient>
    <linearGradient id="body" x1="0.25" y1="0" x2="0.75" y2="1"><stop offset="0%" stop-color="#2a2a30"/><stop offset="40%" stop-color="#18181c"/><stop offset="100%" stop-color="#0c0c0e"/></linearGradient>
    <linearGradient id="sleeve" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#222226"/><stop offset="100%" stop-color="#101012"/></linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.45"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#room)"/>`;
}

/** Flat-lay heavyweight tee — back: collar, shoulders, sleeves, side seams, hem. */
function teeBackSvg(canvas: number): string {
  const w = canvas;
  const h = Math.round(canvas * 1.12);
  const cx = w / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  ${roomBg()}
  <g filter="url(#softShadow)">
    <path id="tee-body" d="M ${w * 0.28} ${h * 0.2} L ${w * 0.36} ${h * 0.14} L ${w * 0.42} ${h * 0.18} L ${w * 0.44} ${h * 0.11} Q ${cx} ${h * 0.08} ${w * 0.56} ${h * 0.11} L ${w * 0.58} ${h * 0.18} L ${w * 0.64} ${h * 0.14} L ${w * 0.72} ${h * 0.2} L ${w * 0.68} ${h * 0.28} L ${w * 0.62} ${h * 0.26} L ${w * 0.58} ${h * 0.86} L ${w * 0.42} ${h * 0.86} L ${w * 0.38} ${h * 0.26} L ${w * 0.32} ${h * 0.28} Z" fill="url(#body)" stroke="#3a3a42" stroke-width="2"/>
    <path d="M ${w * 0.12} ${h * 0.22} L ${w * 0.04} ${h * 0.36} L ${w * 0.08} ${h * 0.52} L ${w * 0.18} ${h * 0.48} L ${w * 0.28} ${h * 0.28} Z" fill="url(#sleeve)" stroke="#333" stroke-width="1.5"/>
    <path d="M ${w * 0.88} ${h * 0.22} L ${w * 0.96} ${h * 0.36} L ${w * 0.92} ${h * 0.52} L ${w * 0.82} ${h * 0.48} L ${w * 0.72} ${h * 0.28} Z" fill="url(#sleeve)" stroke="#333" stroke-width="1.5"/>
    <path d="M ${w * 0.44} ${h * 0.11} Q ${cx} ${h * 0.155} ${w * 0.56} ${h * 0.11} L ${w * 0.54} ${h * 0.17} Q ${cx} ${h * 0.2} ${w * 0.46} ${h * 0.17} Z" fill="#0a0a0c" stroke="#444" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${h * 0.135}" rx="${w * 0.09}" ry="${h * 0.022}" fill="#1a1a1e" stroke="#555" stroke-width="1"/>
    <line x1="${w * 0.42}" y1="${h * 0.22}" x2="${w * 0.42}" y2="${h * 0.84}" stroke="#25252a" stroke-width="1" opacity="0.6"/>
    <line x1="${w * 0.58}" y1="${h * 0.22}" x2="${w * 0.58}" y2="${h * 0.84}" stroke="#25252a" stroke-width="1" opacity="0.6"/>
    <path d="M ${w * 0.38} ${h * 0.86} Q ${cx} ${h * 0.895} ${w * 0.62} ${h * 0.86}" fill="none" stroke="#2a2a30" stroke-width="3"/>
  </g>
  <text x="${cx}" y="${h * 0.97}" text-anchor="middle" fill="#5a5a62" font-size="14" font-family="Arial,sans-serif">Heavyweight tee · back · flat-lay garment mockup</text>
</svg>`;
}

function teeFrontSvg(canvas: number): string {
  const w = canvas;
  const h = Math.round(canvas * 1.12);
  const cx = w / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  ${roomBg()}
  <g filter="url(#softShadow)">
    <path d="M ${w * 0.28} ${h * 0.21} L ${w * 0.36} ${h * 0.15} L ${w * 0.42} ${h * 0.19} L ${w * 0.44} ${h * 0.12} Q ${cx} ${h * 0.09} ${w * 0.56} ${h * 0.12} L ${w * 0.58} ${h * 0.19} L ${w * 0.64} ${h * 0.15} L ${w * 0.72} ${h * 0.21} L ${w * 0.68} ${h * 0.29} L ${w * 0.62} ${h * 0.27} L ${w * 0.58} ${h * 0.87} L ${w * 0.42} ${h * 0.87} L ${w * 0.38} ${h * 0.27} L ${w * 0.32} ${h * 0.29} Z" fill="url(#body)" stroke="#3a3a42" stroke-width="2"/>
    <path d="M ${w * 0.12} ${h * 0.23} L ${w * 0.04} ${h * 0.38} L ${w * 0.08} ${h * 0.54} L ${w * 0.18} ${h * 0.5} L ${w * 0.28} ${h * 0.3} Z" fill="url(#sleeve)" stroke="#333" stroke-width="1.5"/>
    <path d="M ${w * 0.88} ${h * 0.23} L ${w * 0.96} ${h * 0.38} L ${w * 0.92} ${h * 0.54} L ${w * 0.82} ${h * 0.5} L ${w * 0.72} ${h * 0.3} Z" fill="url(#sleeve)" stroke="#333" stroke-width="1.5"/>
    <path d="M ${w * 0.44} ${h * 0.12} Q ${cx} ${h * 0.17} ${w * 0.56} ${h * 0.12} L ${w * 0.54} ${h * 0.2} Q ${cx} ${h * 0.24} ${w * 0.46} ${h * 0.2} Z" fill="#0a0a0c" stroke="#444"/>
    <ellipse cx="${cx}" cy="${h * 0.145}" rx="${w * 0.095}" ry="${h * 0.024}" fill="#1a1a1e" stroke="#555"/>
    <path d="M ${w * 0.38} ${h * 0.87} Q ${cx} ${h * 0.905} ${w * 0.62} ${h * 0.87}" fill="none" stroke="#2a2a30" stroke-width="3"/>
  </g>
  <text x="${cx}" y="${h * 0.97}" text-anchor="middle" fill="#5a5a62" font-size="14" font-family="Arial,sans-serif">Heavyweight tee · front · left-chest zone marked</text>
</svg>`;
}

function hoodieBackSvg(canvas: number): string {
  const w = canvas;
  const h = Math.round(canvas * 1.14);
  const cx = w / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  ${roomBg()}
  <g filter="url(#softShadow)">
    <path d="M ${w * 0.32} ${h * 0.06} L ${cx} ${h * 0.01} L ${w * 0.68} ${h * 0.06} L ${w * 0.66} ${h * 0.14} L ${w * 0.34} ${h * 0.14} Z" fill="#08080a" stroke="#333"/>
    <path d="M ${w * 0.26} ${h * 0.12} Q ${cx} ${h * 0.04} ${w * 0.74} ${h * 0.12} L ${w * 0.7} ${h * 0.2} L ${w * 0.3} ${h * 0.2} Z" fill="#0c0c0e" stroke="#2a2a32"/>
    <path d="M ${w * 0.26} ${h * 0.2} L ${w * 0.34} ${h * 0.16} L ${w * 0.4} ${h * 0.2} L ${w * 0.42} ${h * 0.13} Q ${cx} ${h * 0.1} ${w * 0.58} ${h * 0.13} L ${w * 0.6} ${h * 0.2} L ${w * 0.66} ${h * 0.16} L ${w * 0.74} ${h * 0.2} L ${w * 0.7} ${h * 0.3} L ${w * 0.64} ${h * 0.28} L ${w * 0.6} ${h * 0.88} L ${w * 0.4} ${h * 0.88} L ${w * 0.36} ${h * 0.28} L ${w * 0.3} ${h * 0.3} Z" fill="url(#body)" stroke="#3a3a42" stroke-width="2"/>
    <path d="M ${w * 0.1} ${h * 0.22} L ${w * 0.02} ${h * 0.38} L ${w * 0.06} ${h * 0.55} L ${w * 0.16} ${h * 0.5} L ${w * 0.26} ${h * 0.3} Z" fill="url(#sleeve)" stroke="#333"/>
    <path d="M ${w * 0.9} ${h * 0.22} L ${w * 0.98} ${h * 0.38} L ${w * 0.94} ${h * 0.55} L ${w * 0.84} ${h * 0.5} L ${w * 0.74} ${h * 0.3} Z" fill="url(#sleeve)" stroke="#333"/>
    <path d="M ${w * 0.38} ${h * 0.88} Q ${cx} ${h * 0.92} ${w * 0.62} ${h * 0.88}" fill="none" stroke="#2a2a30" stroke-width="3"/>
  </g>
  <text x="${cx}" y="${h * 0.975}" text-anchor="middle" fill="#5a5a62" font-size="14" font-family="Arial,sans-serif">Oversized hoodie · back · hood-down flat-lay</text>
</svg>`;
}

function hoodieFrontSvg(canvas: number): string {
  const w = canvas;
  const h = Math.round(canvas * 1.14);
  const cx = w / 2;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  ${roomBg()}
  <g filter="url(#softShadow)">
    <path d="M ${w * 0.3} ${h * 0.07} L ${cx} ${h * 0.02} L ${w * 0.7} ${h * 0.07} L ${w * 0.68} ${h * 0.15} L ${w * 0.32} ${h * 0.15} Z" fill="#08080a"/>
    <path d="M ${w * 0.28} ${h * 0.14} Q ${cx} ${h * 0.06} ${w * 0.72} ${h * 0.14} L ${w * 0.68} ${h * 0.22} L ${w * 0.32} ${h * 0.22} Z" fill="#0c0c0e"/>
    <path d="M ${w * 0.28} ${h * 0.22} L ${w * 0.36} ${h * 0.18} L ${w * 0.42} ${h * 0.22} L ${w * 0.44} ${h * 0.14} Q ${cx} ${h * 0.11} ${w * 0.56} ${h * 0.14} L ${w * 0.58} ${h * 0.22} L ${w * 0.64} ${h * 0.18} L ${w * 0.72} ${h * 0.22} L ${w * 0.68} ${h * 0.32} L ${w * 0.62} ${h * 0.3} L ${w * 0.58} ${h * 0.88} L ${w * 0.42} ${h * 0.88} L ${w * 0.38} ${h * 0.3} L ${w * 0.32} ${h * 0.32} Z" fill="url(#body)" stroke="#3a3a42" stroke-width="2"/>
    <path d="M ${w * 0.1} ${h * 0.24} L ${w * 0.02} ${h * 0.4} L ${w * 0.06} ${h * 0.56} L ${w * 0.16} ${h * 0.52} L ${w * 0.28} ${h * 0.32} Z" fill="url(#sleeve)" stroke="#333"/>
    <path d="M ${w * 0.9} ${h * 0.24} L ${w * 0.98} ${h * 0.4} L ${w * 0.94} ${h * 0.56} L ${w * 0.84} ${h * 0.52} L ${w * 0.72} ${h * 0.32} Z" fill="url(#sleeve)" stroke="#333"/>
    <path d="M ${w * 0.4} ${h * 0.58} L ${w * 0.6} ${h * 0.58} L ${w * 0.58} ${h * 0.72} Q ${cx} ${h * 0.78} ${w * 0.42} ${h * 0.72} Z" fill="#101014" stroke="#333" opacity="0.9"/>
    <line x1="${w * 0.36}" y1="${h * 0.65}" x2="${w * 0.64}" y2="${h * 0.65}" stroke="#25252a" stroke-width="1"/>
  </g>
  <text x="${cx}" y="${h * 0.975}" text-anchor="middle" fill="#5a5a62" font-size="14" font-family="Arial,sans-serif">Oversized hoodie · front · kangaroo pocket</text>
</svg>`;
}

export function garmentMockupBaseSvg(view: MockupView, canvas = C): string {
  switch (view) {
    case "tee-back":
      return teeBackSvg(canvas);
    case "tee-front":
      return teeFrontSvg(canvas);
    case "hoodie-back":
      return hoodieBackSvg(canvas);
    case "hoodie-front":
      return hoodieFrontSvg(canvas);
  }
}

export function absolutePrintRect(layout: GarmentMockupLayout): { left: number; top: number; width: number; height: number } {
  const { canvas, printZone } = layout;
  const hFactor = layout.view.startsWith("hoodie") ? 1.14 : 1.12;
  const height = Math.round(canvas * hFactor);
  return {
    left: Math.round(printZone.left * canvas),
    top: Math.round(printZone.top * canvas),
    width: Math.round(printZone.width * canvas),
    height: Math.round(printZone.height * canvas),
  };
}

/** Canvas height for a view (for placement ratios). */
export function garmentCanvasHeight(view: MockupView, canvas = C): number {
  return Math.round(canvas * (view.startsWith("hoodie") ? 1.14 : 1.12));
}
