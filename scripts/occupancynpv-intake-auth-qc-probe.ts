import { CRE_VERCEL_PROJECT_ID } from "../lib/infinity/venture-operating-scale/constants";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";

async function probe(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, { ...init, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      url,
      status: response.status,
      ok: response.ok,
      keys: json && typeof json === "object" ? Object.keys(json as object) : [],
      has_contract: Boolean(json && typeof json === "object" && "contract" in (json as object)),
      has_source: Boolean(json && typeof json === "object" && "source" in (json as object)),
      has_ack: Boolean(json && typeof json === "object" && "acknowledgement" in (json as object)),
      reason: json && typeof json === "object" && "reason" in (json as object)
        ? String((json as { reason?: unknown }).reason)
        : null,
      body_preview: json ? JSON.stringify(json).slice(0, 240) : text.slice(0, 160),
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      keys: [],
      has_contract: false,
      has_source: false,
      has_ack: false,
      reason: error instanceof Error ? error.name : "FETCH_FAILED",
      body_preview: "",
    };
  }
}

async function main() {
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  const token = process.env.VERCEL_TOKEN?.trim() ?? "";
  const team = process.env.VERCEL_TEAM_ID?.trim() ?? "";
  const envUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(CRE_VERCEL_PROJECT_ID)}/env${team ? `?teamId=${encodeURIComponent(team)}` : ""}`;
  const listedRes = await fetch(envUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }).catch(() => null);
  const listedJson = listedRes ? await listedRes.json().catch(() => ({})) as Record<string, unknown> : {};
  const listed = { ok: Boolean(listedRes?.ok), status: listedRes?.status ?? 0, json: listedJson };
  const envs = Array.isArray(listed.json.envs) ? listed.json.envs as Array<Record<string, unknown>> : [];
  const keys = envs.map((row) => String(row.key ?? "")).filter(Boolean).sort();
  const intakeEnv = envs.find((row) => row.key === "INFINITY_IMPROVEMENT_INTAKE_URL");
  const runtimeEnv = envs.find((row) => row.key === "INFINITY_RUNTIME_URL");
  const localIntake = process.env.INFINITY_IMPROVEMENT_INTAKE_URL?.trim() || null;
  const localRuntime = process.env.INFINITY_RUNTIME_URL?.trim() || process.env.HQ_PRODUCTION_RUNTIME_URL?.trim() || null;

  const syntheticBody = JSON.stringify({
    source: "PUBLIC_SITE_FEEDBACK",
    message: "QC probe only — ignore this synthetic occupancy intake reachability check.",
    submission_id: `probe:${Date.now()}`,
    synthetic: true,
    page_url_or_route: "/suggest-improvement",
  });
  const post = { method: "POST" as const, headers: { "Content-Type": "application/json" }, body: syntheticBody };

  const live = await probe("https://occupancynpv.com/api/occupancynpv/improvement-intake", post);
  const hqLocal = await probe("http://127.0.0.1:3000/api/occupancynpv/improvement-intake", post);
  const hqVentures = await probe(
    "http://127.0.0.1:3000/api/ventures/candidate%3A7e7e924e-0741-4155-a729-8d529da77ea9/improvement-intake",
    post,
  );
  const runtime = await probe("https://infinity-runtime.vercel.app/api/occupancynpv/improvement-intake", post);
  const runtimeTick = await probe("https://infinity-runtime.vercel.app/api/runtime/operating-state");
  const hqDash = await probe("http://127.0.0.1:3000/dashboard", {
    headers: { "x-infinity-hq-live-proof": "1" },
  });
  const liveLogin = await probe("https://occupancynpv.com/occupancynpv/app/login");

  const report = {
    vercel_env_ok: listed.ok,
    vercel_env_status: listed.status,
    env_key_count: keys.length,
    has_INFINITY_IMPROVEMENT_INTAKE_URL: Boolean(intakeEnv),
    intake_env_targets: intakeEnv && Array.isArray(intakeEnv.target) ? intakeEnv.target : null,
    intake_env_type: intakeEnv ? String(intakeEnv.type ?? "") : null,
    has_INFINITY_RUNTIME_URL: Boolean(runtimeEnv),
    local_INFINITY_IMPROVEMENT_INTAKE_URL_present: Boolean(localIntake),
    local_runtime_url_present: Boolean(localRuntime),
    interesting_keys: keys.filter((key) => /INTAKE|RUNTIME|HQ|SUPABASE|QC|AUTH|CRON|OCCUPANCYNPV/i.test(key)),
    probes: { live, hqLocal, hqVentures, runtime, runtimeTick, hqDash, liveLogin },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "probe_failed");
  process.exit(1);
});
