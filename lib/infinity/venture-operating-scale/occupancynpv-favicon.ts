import { deflateSync } from "node:zlib";

export const OCCUPANCYNPV_FAVICON_VERSION = "onpv2" as const;
export const OCCUPANCYNPV_FAVICON_NAVY = { r: 29, g: 78, b: 120, a: 255 } as const;
export const OCCUPANCYNPV_FAVICON_CONCEPT =
  "Geometric O: navy #1d4e78 field, thick white ring. OccupancyNPV mark, no text." as const;

export type OccupancynpvComposeFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodeRgbaPng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function blend(coverage: number): { r: number; g: number; b: number; a: number } {
  const t = Math.max(0, Math.min(1, coverage));
  return {
    r: Math.round(OCCUPANCYNPV_FAVICON_NAVY.r + (255 - OCCUPANCYNPV_FAVICON_NAVY.r) * t),
    g: Math.round(OCCUPANCYNPV_FAVICON_NAVY.g + (255 - OCCUPANCYNPV_FAVICON_NAVY.g) * t),
    b: Math.round(OCCUPANCYNPV_FAVICON_NAVY.b + (255 - OCCUPANCYNPV_FAVICON_NAVY.b) * t),
    a: 255,
  };
}

export function occupancynpvORgba(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outer = size * 0.36;
  const inner = size * 0.20;
  const aa = Math.max(0.55, size * 0.04);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      const outerCover = Math.max(0, Math.min(1, (outer + aa - d) / (aa * 2)));
      const hole = Math.max(0, Math.min(1, (inner + aa - d) / (aa * 2)));
      const ring = outerCover * (1 - hole);
      const pixel = blend(ring);
      const i = (y * size + x) * 4;
      rgba[i] = pixel.r;
      rgba[i + 1] = pixel.g;
      rgba[i + 2] = pixel.b;
      rgba[i + 3] = pixel.a;
    }
  }
  return rgba;
}

export function occupancynpvPng(size: number): Buffer {
  return encodeRgbaPng(size, size, occupancynpvORgba(size));
}

export function occupancynpvIco(): Buffer {
  const png16 = occupancynpvPng(16);
  const png32 = occupancynpvPng(32);
  const images = [png16, png32];
  const sizes = [16, 32];
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (let i = 0; i < images.length; i += 1) {
    const entry = 6 + i * 16;
    header[entry] = sizes[i] === 256 ? 0 : sizes[i];
    header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  }
  return Buffer.concat([header, ...images]);
}

export const OCCUPANCYNPV_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" fill="#1d4e78"/>
  <circle cx="16" cy="16" r="9.5" fill="none" stroke="#ffffff" stroke-width="5"/>
</svg>
`;

export function occupancynpvFaviconMetadataBlock(): string {
  return `  icons: {
    icon: [
      { url: "/favicon.ico?v=${OCCUPANCYNPV_FAVICON_VERSION}", type: "image/x-icon", sizes: "32x32" },
      { url: "/icon?v=${OCCUPANCYNPV_FAVICON_VERSION}", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=${OCCUPANCYNPV_FAVICON_VERSION}", sizes: "180x180", type: "image/png" }],
  },`;
}

export function applyOccupancynpvFaviconMetadata(source: string): string {
  if (source.includes(`favicon.ico?v=${OCCUPANCYNPV_FAVICON_VERSION}`)) return source;
  if (/icons\s*:/.test(source)) {
    return source.replace(/icons\s*:\s*\{[\s\S]*?\},/, `${occupancynpvFaviconMetadataBlock()}\n`);
  }
  return source.replace(
    /export const metadata = \{/,
    `export const metadata = {\n${occupancynpvFaviconMetadataBlock()}`,
  );
}

function occupancynpvIconRouteSource(contentType: string, base64: string): string {
  return `import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const BODY = Buffer.from(${JSON.stringify(base64)}, "base64");

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": ${JSON.stringify(contentType)},
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": ${JSON.stringify(contentType)},
      "Content-Length": String(BODY.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
`;
}

export function occupancynpvFaviconRouteFiles(): OccupancynpvComposeFile[] {
  return [
    { path: "app/favicon.ico/route.ts", content: occupancynpvIconRouteSource("image/x-icon", occupancynpvIco().toString("base64")) },
    { path: "app/icon/route.ts", content: occupancynpvIconRouteSource("image/png", occupancynpvPng(32).toString("base64")) },
    { path: "app/apple-touch-icon.png/route.ts", content: occupancynpvIconRouteSource("image/png", occupancynpvPng(180).toString("base64")) },
  ];
}

export function occupancynpvFaviconAssetFiles(): OccupancynpvComposeFile[] {
  return [
    { path: "public/icon.png", content: occupancynpvPng(32).toString("base64"), encoding: "base64" },
    { path: "public/favicon-onpv2.ico", content: occupancynpvIco().toString("base64"), encoding: "base64" },
    { path: "public/apple-touch-icon-onpv2.png", content: occupancynpvPng(180).toString("base64"), encoding: "base64" },
    ...occupancynpvFaviconRouteFiles(),
  ];
}

export function applyInheritedVentureFaviconToFiles<T extends OccupancynpvComposeFile>(files: T[]): T[] {
  return applyOccupancynpvFaviconToFiles(files);
}

const FAVICON_PATHS = new Set(occupancynpvFaviconAssetFiles().map((file) => file.path));

export function applyOccupancynpvFaviconToFiles<T extends OccupancynpvComposeFile>(files: T[]): T[] {
  const kept = files.filter((file) => !FAVICON_PATHS.has(file.path.replace(/\\/g, "/")));
  const withAssets = [...kept, ...(occupancynpvFaviconAssetFiles() as T[])];
  return withAssets.map((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (path === "app/layout.tsx" && file.encoding !== "base64") {
      const content = applyOccupancynpvFaviconMetadata(file.content);
      return content === file.content ? file : { ...file, content };
    }
    return file;
  });
}
