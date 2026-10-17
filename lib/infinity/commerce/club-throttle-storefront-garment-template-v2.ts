/** Back-facing white tee — deterministic SVG layers for storefront merchandising (not provider proof). */

export const GARMENT_CANVAS = { width: 1200, height: 1400 } as const;

/** Print zone on canvas (large back, collar clearance). */
export const GARMENT_BACK_PRINT_RECT = {
  left: 0.28,
  top: 0.22,
  width: 0.44,
  height: 0.48,
} as const;

const GARMENT_FABRIC_STOPS: Record<
  string,
  { top: string; bottom: string; collar: string; stroke: string; collarArc: string; flat: boolean }
> = {
  white: { top: "#faf8f5", bottom: "#ebe6df", collar: "#f7f5f1", stroke: "#cfc7bd", collarArc: "#b8b0a6", flat: false },
  ash: { top: "#c9c5be", bottom: "#a8a49d", collar: "#bdb9b2", stroke: "#9a968f", collarArc: "#9a968f", flat: false },
  /** Flat neutral black — vertical SVG gradients rasterize as visible horizontal banding on PDP heroes. */
  black: { top: "#141414", bottom: "#141414", collar: "#161616", stroke: "#222222", collarArc: "#2a2a2a", flat: true },
  "dark-heather": {
    top: "#4a4f55",
    bottom: "#4a4f55",
    collar: "#52585f",
    stroke: "#3a3f44",
    collarArc: "#5c6268",
    flat: true,
  },
  "light-blue": {
    top: "#b8d4ea",
    bottom: "#9ec3dc",
    collar: "#c5dff0",
    stroke: "#8fb3cf",
    collarArc: "#8fb3cf",
    flat: false,
  },
  natural: {
    top: "#ebe2d0",
    bottom: "#d9cdb8",
    collar: "#efe6d6",
    stroke: "#c4b8a4",
    collarArc: "#c4b8a4",
    flat: false,
  },
};

export function garmentBackBaseSvg(garmentColor = "white"): string {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  const fabric = GARMENT_FABRIC_STOPS[garmentColor.toLowerCase()] ?? GARMENT_FABRIC_STOPS.white;
  const fillRef = fabric.flat ? fabric.top : "url(#fabric)";
  const defs = fabric.flat
    ? ""
    : `<defs>
    <linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${fabric.top}"/>
      <stop offset="100%" stop-color="${fabric.bottom}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>`;
  const shadow = fabric.flat ? "" : ` filter="url(#softShadow)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${defs}
  <rect width="100%" height="100%" fill="#f3f1ed"/>
  <g${shadow}>
    <!-- left sleeve -->
    <path fill="${fillRef}" stroke="${fabric.stroke}" stroke-width="2"
      d="M ${w * 0.08} ${h * 0.2} L ${w * 0.2} ${h * 0.14} L ${w * 0.24} ${h * 0.34} L ${w * 0.18} ${h * 0.42} Z"/>
    <!-- right sleeve -->
    <path fill="${fillRef}" stroke="${fabric.stroke}" stroke-width="2"
      d="M ${w * 0.92} ${h * 0.2} L ${w * 0.8} ${h * 0.14} L ${w * 0.76} ${h * 0.34} L ${w * 0.82} ${h * 0.42} Z"/>
    <!-- body -->
    <path fill="${fillRef}" stroke="${fabric.stroke}" stroke-width="2.5"
      d="M ${w * 0.2} ${h * 0.14} L ${w * 0.36} ${h * 0.1} L ${w * 0.5} ${h * 0.125}
         L ${w * 0.64} ${h * 0.1} L ${w * 0.8} ${h * 0.14}
         L ${w * 0.86} ${h * 0.32} L ${w * 0.82} ${h * 0.9} L ${w * 0.18} ${h * 0.9}
         L ${w * 0.14} ${h * 0.32} Z"/>
    <!-- collar -->
    <path fill="none" stroke="${fabric.collarArc}" stroke-width="2"
      d="M ${w * 0.36} ${h * 0.125} Q ${w * 0.5} ${h * 0.17} ${w * 0.64} ${h * 0.125}"/>
    <path fill="${fabric.collar}" stroke="${fabric.stroke}" stroke-width="1.5"
      d="M ${w * 0.42} ${h * 0.125} Q ${w * 0.5} ${h * 0.155} ${w * 0.58} ${h * 0.125}"/>
  </g>
</svg>`;
}

/** White alpha mask: opaque where garment fabric exists (art must stay inside print rect separately). */
export function garmentBackBodyMaskSvg(): string {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="black"/>
  <path fill="white"
    d="M ${w * 0.08} ${h * 0.2} L ${w * 0.2} ${h * 0.14} L ${w * 0.24} ${h * 0.34} L ${w * 0.18} ${h * 0.42} Z"/>
  <path fill="white"
    d="M ${w * 0.92} ${h * 0.2} L ${w * 0.8} ${h * 0.14} L ${w * 0.76} ${h * 0.34} L ${w * 0.82} ${h * 0.42} Z"/>
  <path fill="white"
    d="M ${w * 0.2} ${h * 0.14} L ${w * 0.36} ${h * 0.1} L ${w * 0.5} ${h * 0.125}
       L ${w * 0.64} ${h * 0.1} L ${w * 0.8} ${h * 0.14}
       L ${w * 0.86} ${h * 0.32} L ${w * 0.82} ${h * 0.9} L ${w * 0.18} ${h * 0.9}
       L ${w * 0.14} ${h * 0.32} Z"/>
</svg>`;
}

export function garmentBackPrintMaskSvg(): string {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const x = w * r.left;
  const y = h * r.top;
  const rw = w * r.width;
  const rh = h * r.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="black"/>
  <rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="8" fill="white"/>
</svg>`;
}

export function garmentFrontBaseSvg(): string {
  const w = GARMENT_CANVAS.width;
  const h = GARMENT_CANVAS.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f3f1ed"/>
  <path fill="#faf8f5" stroke="#cfc7bd" stroke-width="2.5"
    d="M ${w * 0.2} ${h * 0.14} L ${w * 0.36} ${h * 0.1} L ${w * 0.5} ${h * 0.125} L ${w * 0.64} ${h * 0.1} L ${w * 0.8} ${h * 0.14}
       L ${w * 0.86} ${h * 0.32} L ${w * 0.82} ${h * 0.9} L ${w * 0.18} ${h * 0.9} L ${w * 0.14} ${h * 0.32} Z"/>
  <path fill="none" stroke="#b8b0a6" stroke-width="2"
    d="M ${w * 0.36} ${h * 0.125} Q ${w * 0.5} ${h * 0.17} ${w * 0.64} ${h * 0.125}"/>
</svg>`;
}
