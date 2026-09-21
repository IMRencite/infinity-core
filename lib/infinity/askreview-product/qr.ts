import QRCode from "qrcode";

/**
 * Deterministic QR encoder for AskReview kits.
 * Encodes the exact canonical review URL. No tracking redirect.
 * No paid QR provider.
 */
export function encodeQrModules(payload: string): boolean[][] {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => Boolean(qr.modules.get(row, col))),
  );
}

export function generateQrSvg(payload: string): string {
  const modules = encodeQrModules(payload);
  const size = modules.length;
  const scale = 4;
  const quiet = 4;
  const canvas = (size + quiet * 2) * scale;
  const rects: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!modules[row]![col]) continue;
      rects.push(`<rect x="${(col + quiet) * scale}" y="${(row + quiet) * scale}" width="${scale}" height="${scale}" />`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" role="img" aria-label="QR code for Google review link" data-review-url="${escapeXml(payload)}"><title>${escapeXml(payload)}</title><rect width="${canvas}" height="${canvas}" fill="#fff"/><g fill="#111">${rects.join("")}</g></svg>`;
}

export function decodeReviewUrlFromQrSvg(svg: string): string | null {
  const attr = svg.match(/data-review-url="([^"]+)"/);
  if (attr?.[1]) return unescapeXml(attr[1]);
  const title = svg.match(/<title>([^<]+)<\/title>/);
  return title?.[1] ? unescapeXml(title[1]) : null;
}

export function modulesFromQrSvg(svg: string): boolean[][] | null {
  const view = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!view) return null;
  const canvas = Number(view[1]);
  const scale = 4;
  const quiet = 4;
  const size = canvas / scale - quiet * 2;
  if (!Number.isInteger(size) || size < 21) return null;
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const rects = svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="4" height="4"/g);
  for (const match of rects) {
    const col = Number(match[1]) / scale - quiet;
    const row = Number(match[2]) / scale - quiet;
    if (row >= 0 && col >= 0 && row < size && col < size) grid[row]![col] = true;
  }
  return grid;
}

export function qrSvgEncodesUrl(svg: string, url: string): boolean {
  if (!svg.includes("<svg") || decodeReviewUrlFromQrSvg(svg) !== url) return false;
  const fromSvg = modulesFromQrSvg(svg);
  if (!fromSvg) return false;
  const expected = encodeQrModules(url);
  if (fromSvg.length !== expected.length) return false;
  return expected.every((row, r) => row.every((cell, c) => cell === fromSvg[r]![c]));
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function unescapeXml(value: string): string {
  return value.replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}
