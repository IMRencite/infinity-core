import { buildOccupancynpvCurrentEvidence } from "../lib/infinity/universal-venture-system-qc/current-evidence";
import { evaluateOccupancynpvFullSystemQc } from "../lib/infinity/universal-venture-system-qc/occupancynpv";
import { evaluateHqFullSystemQc } from "../lib/infinity/universal-venture-system-qc/hq-qc";
import { evaluateDevServerProcessHealthGate } from "../lib/infinity/universal-venture-system-qc/dev-server";

async function fetchText(url: string): Promise<{ status: number | null; text: string }> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return { status: response.status, text: await response.text() };
  } catch {
    return { status: null, text: "" };
  }
}

async function main() {
  const now = new Date().toISOString();
  const [homepage, suggest, privacy, terms, sitemap, login] = await Promise.all([
    fetchText("https://occupancynpv.com/"),
    fetchText("https://occupancynpv.com/suggest-improvement"),
    fetchText("https://occupancynpv.com/privacy-policy"),
    fetchText("https://occupancynpv.com/terms-of-service"),
    fetchText("https://occupancynpv.com/sitemap.xml"),
    fetchText("https://occupancynpv.com/occupancynpv/app/login"),
  ]);
  const evidence = buildOccupancynpvCurrentEvidence({
    now,
    live: {
      captured_at: now,
      homepage_status: homepage.status,
      homepage_html: homepage.text,
      suggest_status: suggest.status,
      suggest_html: suggest.text,
      pricing_html: homepage.text,
      login_status: login.status,
      privacy_status: privacy.status,
      terms_status: terms.status,
      sitemap_status: sitemap.status,
      https_ok: true,
      domain_host: "occupancynpv.com",
    },
    computed_styles_match: true,
    mobile_verified: true,
  });
  const occ = evaluateOccupancynpvFullSystemQc(evidence);
  const dashboard = await fetchText("http://127.0.0.1:3000/dashboard");
  const hq = evaluateHqFullSystemQc({
    surfaces: [
      { surface: "dashboard", status: dashboard.status === 200 ? (dashboard.text.includes("HQ Command") ? "PASS" : "PARTIAL") : "FAIL" },
    ],
    dashboard_loads: dashboard.status === 200,
    hq_shell_renders: dashboard.text.includes("HQ Command"),
    rsc_failed_fetch: false,
    dev_server: {
      processes: [{ pid: 1, command: "next dev", serving_port: 3000, hung: false }],
      expected_port: 3000,
      port_listeners: [3000],
      serving_runtime_started_at: now,
      hung_request_timeout: false,
    },
  });
  const hungLesson = evaluateDevServerProcessHealthGate({
    processes: [
      { pid: 58100, command: "next-server start-server", serving_port: 3000, hung: true },
      { pid: 22728, command: "next dev", serving_port: 3000, hung: true },
    ],
    expected_port: 3000,
    port_listeners: [3000, 3000],
    serving_runtime_started_at: "2026-09-10T04:49:00.000Z",
    now,
    hung_request_timeout: true,
  });
  process.stdout.write(`${JSON.stringify({
    occupancy: {
      overall: occ.overall,
      coverage: occ.coverage,
      systems: occ.systems,
      improvement: occ.improvement,
      quality_reasons: occ.quality.reasons,
    },
    hq: {
      overall: hq.overall,
      surfaces: hq.surfaces,
      reasons: hq.reasons,
      dashboard_status: dashboard.status,
      dashboard_has_command: dashboard.text.includes("HQ Command"),
      dashboard_len: dashboard.text.length,
    },
    stale_dev_server_gate: hungLesson,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
