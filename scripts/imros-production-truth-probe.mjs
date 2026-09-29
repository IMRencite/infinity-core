#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const URL = "https://imros.io/public/operations-room";
const RUNTIME_PROJECT = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const EXPECTED_SHA = process.env.EXPECTED_IMROS_SHA ?? execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

function loadToken() {
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^VERCEL_(?:ACCESS_)?TOKEN=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return process.env.VERCEL_TOKEN ?? process.env.VERCEL_ACCESS_TOKEN ?? null;
}

async function vercelJson(path, token) {
  const team = process.env.VERCEL_TEAM_ID;
  const sep = path.includes("?") ? "&" : "?";
  const teamQ = team ? `${sep}teamId=${encodeURIComponent(team)}` : "";
  const res = await fetch(`https://api.vercel.com${path}${teamQ}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function deploymentIdentity(token) {
  const alias = await vercelJson("/v13/deployments/imros.io", token);
  const dep = alias.json;
  const runtimeProd = await vercelJson(`/v6/deployments?projectId=${RUNTIME_PROJECT}&target=production&limit=3`, token);
  return {
    alias_status: alias.status,
    alias_deployment_id: dep?.id ?? dep?.deploymentId ?? null,
    alias_url: dep?.url ?? null,
    alias_meta: dep?.meta ?? null,
    alias_git: dep?.meta?.githubCommitSha ?? dep?.meta?.gitlabCommitSha ?? dep?.gitSource?.sha ?? null,
    alias_created: dep?.created ?? null,
    runtime_recent: (runtimeProd.json?.deployments ?? []).map((row) => ({
      id: row.uid ?? row.id,
      url: row.url,
      ready: row.readyState,
      sha: row.meta?.githubCommitSha ?? row.meta?.gitlabCommitSha ?? null,
      created: row.created,
    })),
  };
}

async function hashUrl(url) {
  const abs = url.startsWith("http") ? url : `https://imros.io${url}`;
  const res = await fetch(abs, { redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    url: abs,
    status: res.status,
    contentType: res.headers.get("content-type"),
    bytes: buf.length,
    sha256_prefix: createHash("sha256").update(buf).digest("hex").slice(0, 16),
  };
}

async function liveDomProbe() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "mobile", width: 390, height: 844 },
  ];
  const out = {};
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const resp = await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
    const headers = resp?.headers() ?? {};
    const imr = page.locator("[data-imr-brand-mark]").first();
    const hero = page.locator("[data-infinity-os-hero-logo] img").first();
    await imr.waitFor({ state: "attached", timeout: 30000 }).catch(() => null);
    const imrStyle = await imr.evaluate((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const chain = [];
      let node = el;
      for (let i = 0; i < 8 && node; i += 1) {
        chain.push({
          tag: node.tagName.toLowerCase(),
          className: node.className?.toString?.() ?? "",
          id: node.id ?? "",
        });
        node = node.parentElement;
      }
      return {
        position: cs.position,
        top: cs.top,
        right: cs.right,
        width: cs.width,
        height: cs.height,
        zIndex: cs.zIndex,
        transform: cs.transform,
        filter: cs.filter,
        mixBlendMode: cs.mixBlendMode,
        opacity: cs.opacity,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        parentChain: chain,
      };
    }).catch((e) => ({ error: String(e) }));

    const heroInfo = await hero.evaluate((img) => {
      const cs = getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        mixBlendMode: cs.mixBlendMode,
        backgroundColor: cs.backgroundColor,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      };
    }).catch((e) => ({ error: String(e) }));

    const scrollSamples = [];
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(maxScroll * pct));
      await page.waitForTimeout(250);
      const sample = await page.evaluate(() => {
        const imrEl = document.querySelector("[data-imr-brand-mark]");
        const sidebar = document.querySelector("[data-public-command-rail], .commandRail, [data-hq-deck]");
        const imr = imrEl?.getBoundingClientRect();
        const side = sidebar?.getBoundingClientRect();
        let overlap = 0;
        if (imr && side) {
          const x = Math.max(0, Math.min(imr.right, side.right) - Math.max(imr.left, side.left));
          const y = Math.max(0, Math.min(imr.bottom, side.bottom) - Math.max(imr.top, side.top));
          overlap = x * y;
        }
        return {
          scrollY: window.scrollY,
          imrVisible: imr ? imr.bottom > 0 && imr.top < window.innerHeight && imr.width > 0 : false,
          imrRect: imr ? { top: imr.top, bottom: imr.bottom, w: imr.width, h: imr.height } : null,
          overlapWithSidebarPx: overlap,
        };
      });
      scrollSamples.push({ pct, ...sample });
    }

    out[vp.name] = {
      responseHeaders: {
        "x-vercel-id": headers["x-vercel-id"] ?? null,
        age: headers["age"] ?? null,
        "cache-control": headers["cache-control"] ?? null,
      },
      imr: imrStyle,
      hero: heroInfo,
      scrollSamples,
    };
    await page.close();
  }
  await browser.close();
  return out;
}

const token = loadToken();
const identity = token ? await deploymentIdentity(token) : { error: "NO_VERCEL_TOKEN" };
const sourceLogo = join(process.cwd(), "public/brand/infinity-os-logo.png");
const sourceHash = createHash("sha256").update(readFileSync(sourceLogo)).digest("hex").slice(0, 16);
const live = await liveDomProbe();
const heroSrc = live.desktop?.hero?.src ?? live.mobile?.hero?.src ?? "/brand/infinity-os-logo.png";
const liveAsset = await hashUrl(heroSrc);
const imrSrc = "/brand/imr-mark.png";
const liveImrAsset = await hashUrl(imrSrc);

const observedSha = identity.alias_git ?? identity.alias_meta?.gitCommitSha ?? null;
const releaseParity =
  observedSha && (EXPECTED_SHA.startsWith(observedSha.slice(0, 7)) || EXPECTED_SHA === observedSha)
    ? "PASS"
    : "FAIL";

const report = {
  collected_at: new Date().toISOString(),
  url: URL,
  expected_sha: EXPECTED_SHA,
  observed_production_sha: observedSha,
  observed_vercel_project: "imros-public",
  expected_deployment: "infinity-runtime production (imros.io alias)",
  observed_deployment: identity.alias_deployment_id ?? null,
  domain_alias_target: identity.alias_url ?? null,
  release_parity: releaseParity,
  deployment_identity: identity,
  source_asset_hash: sourceHash,
  live_hero_asset: liveAsset,
  live_imr_asset: liveImrAsset,
  asset_parity: liveAsset.sha256_prefix === sourceHash ? "PASS" : "FAIL",
  live_dom: live,
};

writeFileSync(".infinity/blog-os/imros-production-truth-probe.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
