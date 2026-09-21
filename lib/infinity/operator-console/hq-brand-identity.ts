import { encodeRgbaPng } from "@/lib/infinity/venture-operating-scale/occupancynpv-favicon";
export {
  HQ_BROWSER_TITLE,
  HQ_GLOBAL_IDENTITY,
  HQ_GLOBAL_IDENTITY_PRINCIPLE,
  HQ_ICON_VERSION,
  HQ_METADATA_DESCRIPTION,
  hqApplicationMetadata,
  hqSelectedVentureIsOccupancynpv,
} from "./hq-brand-context";

/** Dark field + white interlocking rings. Not OccupancyNPV navy O. */
export function infinityOsIconRgba(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const cx1 = size * 0.34;
  const cx2 = size * 0.66;
  const cy = (size - 1) / 2;
  const ring = size * 0.2;
  const stroke = Math.max(1.2, size * 0.09);
  const aa = Math.max(0.55, size * 0.04);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d1 = Math.abs(Math.hypot(x - cx1, y - cy) - ring);
      const d2 = Math.abs(Math.hypot(x - cx2, y - cy) - ring);
      const cover = Math.max(
        Math.max(0, Math.min(1, (stroke / 2 + aa - d1) / (aa * 2))),
        Math.max(0, Math.min(1, (stroke / 2 + aa - d2) / (aa * 2))),
      );
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(9 + (250 - 9) * cover);
      rgba[i + 1] = Math.round(9 + (250 - 9) * cover);
      rgba[i + 2] = Math.round(11 + (250 - 11) * cover);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

export function infinityOsPng(size: number): Buffer {
  return encodeRgbaPng(size, size, infinityOsIconRgba(size));
}

export function infinityOsIco(): Buffer {
  const images = [infinityOsPng(16), infinityOsPng(32)];
  const sizes = [16, 32];
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (let i = 0; i < images.length; i += 1) {
    const entry = 6 + i * 16;
    header[entry] = sizes[i];
    header[entry + 1] = sizes[i];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  }
  return Buffer.concat([header, ...images]);
}

