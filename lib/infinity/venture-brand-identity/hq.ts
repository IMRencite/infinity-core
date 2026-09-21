import { siteChromeSource } from "@/lib/infinity/venture-website-architecture/site-chrome";
import { occupancynpvAppHeaderBrandMarkup, occupancynpvBrandIdentityContract } from "./occupancynpv";

export type HqVentureBrandInventory = {
  brand_identity: "PASS" | "FAIL";
  logo: "PASS" | "FAIL";
  favicon: "PASS" | "FAIL";
  brand_consistency: "PASS" | "FAIL";
  metadata_identity: "PASS" | "FAIL";
};

function pass(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export function evaluateOccupancynpvHqBrandInventory(): HqVentureBrandInventory {
  const identity = occupancynpvBrandIdentityContract();
  const chrome = siteChromeSource();
  const app = occupancynpvAppHeaderBrandMarkup();
  const logo = /data-venture-logo=/.test(chrome)
    && /<svg[\s\S]*circle[\s\S]*<\/svg>/.test(chrome)
    && chrome.includes(identity.brand_name)
    && /data-venture-wordmark=/.test(chrome)
    && /<svg[\s\S]*<\/svg>/.test(identity.logo_mark_asset);
  const favicon = /favicon/i.test(identity.favicon_asset) && identity.favicon_asset.includes("onpv2");
  const consistency = chrome.includes(identity.brand_name)
    && app.includes(identity.brand_name)
    && /data-venture-logo=/.test(app)
    && identity.logo_mark_asset.includes(identity.primary_color);
  const metadata = identity.metadata_title.includes(identity.brand_name)
    && identity.metadata_title.includes(identity.venture_name);
  return {
    brand_identity: pass(logo && favicon && consistency && metadata),
    logo: pass(logo),
    favicon: pass(favicon),
    brand_consistency: pass(consistency),
    metadata_identity: pass(metadata),
  };
}
