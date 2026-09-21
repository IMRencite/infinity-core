import { applyOccupancynpvBrandCss } from "./logo";
import { occupancynpvAppHeaderBrandMarkup, occupancynpvBrandIdentityContract, occupancynpvPublicHeaderBrandMarkup } from "./occupancynpv";

export type BrandComposeFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

function norm(path: string): string {
  return path.replace(/\\/g, "/");
}

export function applyOccupancynpvPublicHeaderBrand(source: string): string {
  if (source.includes('data-venture-logo="compact"') && source.includes("OccupancyNPV")) return source;
  return source.replace(
    /<Link className="pv-nav-brand" href="\/">[\s\S]*?<\/Link>/,
    occupancynpvPublicHeaderBrandMarkup(),
  );
}

export function applyOccupancynpvAppHeaderBrand(source: string): string {
  if (source.includes('data-venture-logo="compact"') && source.includes("onpv-appbar-brand")) return source;
  return source.replace(
    /<a className="onpv-appbar-brand" href="\/occupancynpv\/app">OccupancyNPV<\/a>/,
    occupancynpvAppHeaderBrandMarkup(),
  );
}

export function applyOccupancynpvLoginBrand(source: string): string {
  if (source.includes('data-venture-brand="occupancynpv"') && source.includes("onpv-page--auth")) return source;
  if (!source.includes("onpv-page--auth")) return source;
  const mark = occupancynpvAppHeaderBrandMarkup();
  if (source.includes("<h1>")) {
    return source.replace("<h1>", `${mark}\n      <h1>`);
  }
  return source;
}

export function applyOccupancynpvLayoutMetadata(source: string): string {
  const identity = occupancynpvBrandIdentityContract();
  let next = source;
  if (/title:\s*\{\s*default:/.test(next)) {
    next = next.replace(
      /title:\s*\{\s*default:\s*(?:"[^"]*"|'[^']*')/,
      `title: { default: ${JSON.stringify(identity.metadata_title)}`,
    );
    next = next.replace(/template:\s*"%s"/, `template: "%s · OccupancyNPV"`);
  }
  if (!/\n\s*description:\s*/.test(next)) {
    next = next.replace(
      /export const metadata = \{/,
      `export const metadata = {\n  description: ${JSON.stringify(identity.metadata_description)},`,
    );
  }
  return next;
}

export function applyOccupancynpvBrandIdentityToFiles<T extends BrandComposeFile>(files: T[]): T[] {
  return files.map((file) => {
    if (file.encoding === "base64") return file;
    const path = norm(file.path);
    let content = file.content;
    if (path === "components/site-chrome.tsx") content = applyOccupancynpvPublicHeaderBrand(content);
    if (path === "app/layout.tsx") content = applyOccupancynpvLayoutMetadata(content);
    if (path === "app/page.tsx") {
      content = content.replace(/title:\s*"Compare commercial lease economics"/, `title: ${JSON.stringify(occupancynpvBrandIdentityContract().metadata_title)}`);
    }
    if (path === "app/occupancynpv/app/layout.tsx") {
      content = applyOccupancynpvAppHeaderBrand(content)
        .replace("/occupancynpv/icon?v=onpv2", "/icon?v=onpv2");
    }
    if (path === "app/occupancynpv/app/login/page.tsx") content = applyOccupancynpvLoginBrand(content);
    if (path === "styles/globals.css") content = applyOccupancynpvBrandCss(content);
    return content === file.content ? file : { ...file, content };
  });
}
