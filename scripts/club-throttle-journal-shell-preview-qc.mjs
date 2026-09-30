/**
 * PREVIEW ONLY — composed Club Throttle storefront shell, local Next dev, Playwright QC.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn, execSync } from "node:child_process";
import { composeClubThrottleStorefrontFiles } from "../lib/infinity/commerce/club-throttle-storefront-compose.ts";

function freePreviewPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
      const pids = new Set(
        out
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } catch {
          /* already gone */
        }
      }
      return;
    }
    execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: "ignore", shell: true });
  } catch {
    /* port already free */
  }
}

const PORT = Number(process.env.CT_PREVIEW_PORT ?? 3020);
const DEST = join(process.env.TEMP ?? "/tmp", "infinity-club-throttle-journal-preview");
const ROUTE = process.argv[2] ?? "/journal/apparel/how-riders-choose-a-shirt/";
const EXPECTED_CANONICAL =
  process.argv[3] ?? "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

function materialize(files) {
  rmSync(DEST, { recursive: true, force: true });
  for (const file of files) {
    const target = join(DEST, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content,
    );
  }
  const pkgPath = join(DEST, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.scripts = { ...pkg.scripts, dev: `next dev -p ${PORT}` };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function waitForUrl(url, ms = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (res.ok) return resolve(true);
      } catch {
        /* retry */
      }
      if (Date.now() - start > ms) return reject(new Error("dev_server_timeout"));
      setTimeout(tick, 1500);
    };
    tick();
  });
}

async function main() {
  freePreviewPort(PORT);
  const composed = composeClubThrottleStorefrontFiles();
  materialize(composed.files);
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], {
    cwd: DEST,
    stdio: "inherit",
    shell: true,
  });
  await new Promise((resolve, reject) => {
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`npm install exit ${code}`))));
  });

  const dev = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd: DEST,
    stdio: "ignore",
    shell: true,
    detached: true,
  });
  dev.unref();
  const origin = `http://127.0.0.1:${PORT}`;
  await waitForUrl(`${origin}${ROUTE}`);

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${origin}${ROUTE}`, { waitUntil: "networkidle", timeout: 90000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const proof = await page.evaluate((expectedCanonical) => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth > window.innerWidth + 2;
      const shell = Boolean(document.querySelector("[data-blog-article-shell], .onpv-blog-article-shell"));
      const hero = Boolean(document.querySelector("[data-blog-article-hero]"));
      const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
      const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
      const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter(Boolean);
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? "");
      const graphText = ld.join("\n");
      const norm = (value) => value.replace(/\/+$/, "").toLowerCase();
      return {
        overflowX,
        shell,
        hero,
        h1,
        words: text.split(" ").filter(Boolean).length,
        internal_links: links.filter((h) => h.startsWith("/")).length,
        canonical,
        canonical_pass: norm(canonical) === norm(expectedCanonical),
        schema_nodes: ld.length,
        has_blog_posting: graphText.includes("BlogPosting"),
        has_webpage: graphText.includes("WebPage"),
        has_breadcrumb: graphText.includes("BreadcrumbList"),
        has_organization: graphText.includes("Organization"),
        has_website: graphText.includes("WebSite"),
        has_faq: graphText.includes("FAQPage"),
        schema_url_match: graphText.includes(expectedCanonical.replace(/\/+$/, "")),
      };
    }, EXPECTED_CANONICAL);
    const slug = ROUTE.replace(/\/+$/, "").split("/").pop();
    const outDir = join(process.cwd(), ".infinity/blog-os/ct-journal-preview");
    const shot = join(outDir, `${slug ?? "article"}-${vp.name}-${vp.width}.png`);
    mkdirSync(dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });
    rows.push({ viewport: vp.name, width: vp.width, ...proof, screenshot: shot });
    await page.close();
  }
  await browser.close();

  const canonicalPass = rows.every((row) => row.canonical_pass);
  const schemaPass = rows.every(
    (row) =>
      row.has_blog_posting
      && row.has_webpage
      && row.has_breadcrumb
      && row.has_organization
      && row.has_website
      && row.schema_url_match,
  );
  const report = {
    collected_at: new Date().toISOString(),
    preview_only: true,
    production_deployed: false,
    origin,
    route: ROUTE,
    expected_canonical: EXPECTED_CANONICAL,
    compose_digest: composed.digest,
    rows,
    desktop_render: rows.find((r) => r.viewport === "desktop")?.overflowX === false ? "PASS" : "FAIL",
    tablet_render: rows.find((r) => r.viewport === "tablet")?.overflowX === false ? "PASS" : "FAIL",
    mobile_render: rows.find((r) => r.viewport === "mobile")?.overflowX === false ? "PASS" : "FAIL",
    full_scroll: rows.every((r) => r.shell && r.words > 800) ? "PASS" : "FAIL",
    canonical: canonicalPass ? "PASS" : "FAIL",
    schema: schemaPass ? "PASS" : "FAIL",
  };
  writeFileSync(".infinity/blog-os/club-throttle-journal-shell-preview-qc.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.canonical !== "PASS" || report.schema !== "PASS") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
