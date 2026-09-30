/**
 * PREVIEW ONLY — composed Club Throttle storefront shell, local Next dev, Playwright QC.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn, execSync } from "node:child_process";
import { composeClubThrottleStorefrontFiles } from "../lib/infinity/commerce/club-throttle-storefront-compose.ts";
import { evaluateConsumerEditorialPublishStack } from "../lib/infinity/organic-growth-engine/continuous/consumer-editorial-publish-loop.ts";
import {
  evaluateBlogHeadingDensityGate,
  evaluateBlogTransitionContinuityGate,
  evaluateEditorialNarrativeArchitectureGate,
  evaluateEditorialPointStrengthGate,
  evaluateEditorialSpecificityGate,
  evaluateReaderCuriosityGate,
  evaluateEditorialRhythmGate,
  evaluateSeoScaffoldingExposureGate,
  evaluateFaqRepeatsBodyGate,
  evaluateHolisticPublicationQualityJudge,
  evaluateHumanFirstEditorialQcV2,
} from "../lib/infinity/organic-growth-engine/continuous/blog-editorial-narrative-gates.ts";
import { evaluateHumanFirstEditorialQc } from "../lib/infinity/organic-growth-engine/continuous/blog-human-flow-gates.ts";
import { evaluateBlogShareabilityGate } from "../lib/infinity/organic-growth-engine/continuous/blog-consumer-editorial-quality.ts";
import { clubThrottleShirtV5Body } from "../lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-shirt.ts";

const PORT = Number(process.env.CT_PREVIEW_PORT ?? 3020);
const RUN_ID = `${process.pid}-${Date.now()}`;
const DEST = join(process.env.TEMP ?? "/tmp", `infinity-club-throttle-journal-preview-${RUN_ID}`);
const PREVIEW_DIR_MARKER = "infinity-club-throttle-journal-preview";
const ROUTE = process.argv[2] ?? "/journal/apparel/how-riders-choose-a-shirt/";
const EXPECTED_CANONICAL =
  process.argv[3] ?? "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function previewProcessCommandLine(pid) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`wmic process where processid=${pid} get commandline /format:list`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const line = out
        .split(/\r?\n/)
        .map((row) => row.trim())
        .find((row) => row.toLowerCase().startsWith("commandline="));
      return line?.slice("commandline=".length) ?? "";
    }
    const out = execSync(`ps -p ${pid} -o args=`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return out.trim();
  } catch {
    return "";
  }
}

function isKnownClubThrottlePreviewProcess(pid, port) {
  const cmd = previewProcessCommandLine(pid).toLowerCase();
  if (!cmd) return false;
  return (
    cmd.includes(PREVIEW_DIR_MARKER)
    || (cmd.includes("next dev") && (cmd.includes(`-p ${port}`) || cmd.includes(`--port ${port}`) || cmd.includes(`--port=${port}`)))
  );
}

function listeningPidsOnPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      return [
        ...new Set(
          out
            .split(/\r?\n/)
            .map((line) => line.trim().split(/\s+/).pop())
            .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
        ),
      ];
    }
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return out
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function freeStaleClubThrottlePreviewPort(port) {
  const pids = listeningPidsOnPort(port);
  const released = [];
  const blocked = [];
  for (const pid of pids) {
    if (isKnownClubThrottlePreviewProcess(pid, port)) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /F /PID ${pid} /T`, { stdio: "ignore" });
        } else {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        }
        released.push(pid);
      } catch {
        blocked.push(pid);
      }
    } else {
      blocked.push(pid);
    }
  }
  return { released, blocked };
}

async function stopPreviewDevProcess(dev) {
  if (!dev || dev.killed || dev.exitCode != null) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${dev.pid} /T`, { stdio: "ignore" });
    } else {
      process.kill(-dev.pid, "SIGTERM");
    }
  } catch {
    try {
      dev.kill("SIGKILL");
    } catch {
      /* already stopped */
    }
  }
  await sleep(2500);
}

async function cleanupPreviewDir(dir, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 400 });
      return { ok: true, warning: null };
    } catch (error) {
      if (i < attempts - 1) await sleep(800 * (i + 1));
      if (i === attempts - 1) {
        return {
          ok: false,
          warning: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }
  return { ok: false, warning: "cleanup_exhausted" };
}

function materialize(files, dest) {
  mkdirSync(dest, { recursive: true });
  for (const file of files) {
    const target = join(dest, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content,
    );
  }
  const pkgPath = join(dest, "package.json");
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

function gatePass(gate) {
  return gate.result === "PASS" ? "PASS" : "FAIL";
}

function buildRenderedEditorialReport(draft) {
  const v2 = evaluateHumanFirstEditorialQcV2(draft);
  const human = evaluateHumanFirstEditorialQc(draft);
  const stack = evaluateConsumerEditorialPublishStack({ draft });
  return {
    central_thesis: gatePass(evaluateEditorialNarrativeArchitectureGate(draft)),
    narrative_spine: v2.reasons.includes("NO_NARRATIVE_SPINE") ? "FAIL" : "PASS",
    opening_tension: gatePass(evaluateReaderCuriosityGate(draft)),
    heading_density: gatePass(evaluateBlogHeadingDensityGate(draft)),
    section_depth: v2.reasons.some((r) => /MICRO_SECTION|TEMPLATED|HEADLINE_TO_HEADLINE/.test(r)) ? "FAIL" : "PASS",
    transition_continuity: gatePass(evaluateBlogTransitionContinuityGate(draft)),
    point_strength: gatePass(evaluateEditorialPointStrengthGate(draft)),
    specificity: gatePass(evaluateEditorialSpecificityGate(draft)),
    point_of_view: v2.reasons.includes("WEAK_POINT_OF_VIEW") ? "FAIL" : "PASS",
    reader_curiosity: gatePass(evaluateReaderCuriosityGate(draft)),
    editorial_rhythm: gatePass(evaluateEditorialRhythmGate(draft)),
    seo_scaffolding: gatePass(evaluateSeoScaffoldingExposureGate(draft)),
    faq_repetition: gatePass(evaluateFaqRepeatsBodyGate(draft)),
    share_value: gatePass(evaluateBlogShareabilityGate(draft)),
    ending_payoff: v2.reasons.includes("NO_PAYOFF") ? "FAIL" : "PASS",
    publication_quality: gatePass(evaluateHolisticPublicationQualityJudge(draft)),
    human_first_editorial_qc_v2: v2.result,
    human_first_editorial_qc: human.result,
    consumer_publish_stack: stack.result,
    failure_reasons: [...new Set([...v2.reasons, ...stack.reasons].filter((r) => r !== "OK"))],
    automated_final_verdict: v2.result === "PASS" && stack.result === "PASS" ? "PASS" : "FAIL",
  };
}

async function main() {
  const portState = freeStaleClubThrottlePreviewPort(PORT);
  const stillBlocked = listeningPidsOnPort(PORT).filter((pid) => !portState.released.includes(pid));
  if (stillBlocked.length > 0) {
    throw new Error(
      `PORT_${PORT}_IN_USE_BY_NON_PREVIEW_PROCESS pids=${stillBlocked.join(",")} — not killing unrelated services`,
    );
  }

  const composed = composeClubThrottleStorefrontFiles();
  materialize(composed.files, DEST);
  let dev = null;
  let cleanup = { ok: true, warning: null };

  try {
    const install = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["install"], {
      cwd: DEST,
      stdio: "inherit",
      shell: true,
    });
    await new Promise((resolve, reject) => {
      install.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`npm install exit ${code}`))));
    });

    dev = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
      cwd: DEST,
      stdio: "ignore",
      shell: true,
      detached: process.platform !== "win32",
    });

    const origin = `http://127.0.0.1:${PORT}`;
    await waitForUrl(`${origin}${ROUTE}`);

    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    const rows = [];
    let renderedArticle = null;

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
        const articleRoot =
          document.querySelector("[data-blog-article-shell], .onpv-blog-article-shell, article") ?? document.body;
        const articleText = (articleRoot?.innerText ?? "").trim();
        const headings = [...articleRoot.querySelectorAll("h2")].map((h) => h.textContent?.trim() ?? "").filter(Boolean);
        const cta = Boolean(
          [...articleRoot.querySelectorAll("a[href]")].some((a) => /shop|collection|after dark/i.test(a.textContent ?? "")),
        );
        const related = Boolean(
          [...document.querySelectorAll("a[href]")].some((a) => /journal|related|read/i.test(a.textContent ?? "")),
        );
        const contamination = /occupancynpv|commercial lease npv|cam reconciliation hub/i.test(text);
        return {
          overflowX,
          shell,
          hero,
          h1,
          words: text.split(" ").filter(Boolean).length,
          article_words: articleText.split(/\s+/).filter(Boolean).length,
          article_headings: headings,
          article_body: articleText,
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
          cta,
          related_reads: related,
          content_contamination: contamination,
          route_identity_pass: h1.length > 10 && shell,
        };
      }, EXPECTED_CANONICAL);

      if (vp.name === "desktop") renderedArticle = proof;

      const slug = ROUTE.replace(/\/+$/, "").split("/").pop();
      const outDir = join(process.cwd(), ".infinity/blog-os/ct-journal-preview");
      const shot = join(outDir, `${slug ?? "article"}-${vp.name}-${vp.width}.png`);
      mkdirSync(dirname(shot), { recursive: true });
      await page.screenshot({ path: shot, fullPage: true });
      rows.push({ viewport: vp.name, width: vp.width, ...proof, screenshot: shot });
      await page.close();
    }
    await browser.close();

    const shirt = clubThrottleShirtV5Body();
    const draft = {
      title: renderedArticle?.h1 ?? shirt.answer,
      meta_description: shirt.answer,
      h1: renderedArticle?.h1 ?? "How riders choose a shirt that survives the ride home",
      headings: renderedArticle?.article_headings?.length
        ? renderedArticle.article_headings
        : shirt.headings,
      body: renderedArticle?.article_body ?? shirt.body,
      direct_answer: shirt.answer,
      citations: [],
      schema: [],
      canonical: EXPECTED_CANONICAL,
      breadcrumbs: [],
      internal_links: [],
      word_count: (renderedArticle?.article_body ?? shirt.body).split(/\s+/).length,
      visible_faqs: shirt.faqs,
      origin: "https://clubthrottle.com",
    };

    const editorial = buildRenderedEditorialReport(draft);
    const minArticleWords = 600;
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
      preview_run_id: RUN_ID,
      preview_temp_dir: DEST,
      port: PORT,
      port_strategy: {
        freed_preview_pids: portState.released,
        left_untouched_pids: portState.blocked,
      },
      origin,
      route: ROUTE,
      expected_canonical: EXPECTED_CANONICAL,
      compose_digest: composed.digest,
      rows,
      desktop_render: rows.find((r) => r.viewport === "desktop")?.overflowX === false ? "PASS" : "FAIL",
      tablet_render: rows.find((r) => r.viewport === "tablet")?.overflowX === false ? "PASS" : "FAIL",
      mobile_render: rows.find((r) => r.viewport === "mobile")?.overflowX === false ? "PASS" : "FAIL",
      horizontal_overflow_count: rows.filter((r) => r.overflowX).length,
      full_scroll:
        rows.every((r) => r.shell && (r.article_words ?? r.words) >= minArticleWords) ? "PASS" : "FAIL",
      article_hero: rows.every((r) => r.hero) ? "PASS" : "FAIL",
      typography: rows.every((r) => r.h1.length > 10) ? "PASS" : "FAIL",
      internal_links: rows.every((r) => r.internal_links >= 3) ? "PASS" : "FAIL",
      related_reads: rows.every((r) => r.related_reads) ? "PASS" : "FAIL",
      cta: rows.every((r) => r.cta) ? "PASS" : "FAIL",
      route_identity: rows.every((r) => r.route_identity_pass) ? "PASS" : "FAIL",
      content_contamination: rows.every((r) => !r.content_contamination) ? "PASS" : "FAIL",
      canonical: canonicalPass ? "PASS" : "FAIL",
      schema: schemaPass ? "PASS" : "FAIL",
      rendered_editorial_v2: editorial,
      club_throttle_rewrite_automated_qc: editorial.automated_final_verdict,
      club_throttle_rewrite_founder_qc: "PENDING",
      preview_runner_qc: "PASS",
    };

    const founderPath = join(process.cwd(), ".infinity/blog-os/ct-shirt-rewrite-founder-preview.txt");
    writeFileSync(
      founderPath,
      [
        "CLUB THROTTLE — REWRITE FOUNDER PREVIEW (rendered shell extract)",
        `URL: ${origin}${ROUTE}`,
        `Collected: ${report.collected_at}`,
        "",
        draft.h1,
        "",
        draft.body,
        "",
        "---",
        `Automated editorial V2: ${editorial.automated_final_verdict}`,
        "Founder QC: PENDING",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(".infinity/blog-os/club-throttle-journal-shell-preview-qc.json", `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));

    const technicalFail =
      report.canonical !== "PASS"
      || report.schema !== "PASS"
      || report.desktop_render !== "PASS"
      || report.content_contamination !== "PASS"
      || editorial.automated_final_verdict !== "PASS";
    if (technicalFail) process.exitCode = 1;
  } finally {
    await stopPreviewDevProcess(dev);
    cleanup = await cleanupPreviewDir(DEST);
    if (!cleanup.ok) {
      console.warn(
        JSON.stringify({
          PREVIEW_CLEANUP_WARNING: cleanup.warning,
          preview_temp_dir: DEST,
          note: "QC may still be valid; remove stale dir manually if needed",
        }),
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
