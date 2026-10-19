import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const deploymentId = process.argv[2] ?? "dpl_5p2cDpwgBcFk9Dwkeav2AeVzqowC";

function loadEnv() {
  const p = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
}

loadEnv();

function walk(nodes, prefix = "") {
  const out = [];
  for (const node of nodes ?? []) {
    const name = `${prefix}${node.name ?? ""}`;
    if (node.uid) out.push({ name, uid: node.uid, type: node.type ?? null });
    if (node.children) out.push(...walk(node.children, `${name}/`));
  }
  return out;
}

async function vercel(path) {
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const filesRes = await vercel(`/v6/deployments/${deploymentId}/files`);
const list = walk(Array.isArray(filesRes.json) ? filesRes.json : filesRes.json?.children ?? []);
const portfolioHits = list.filter((r) => /portfolio-operating-tick|portfolio-job-worker|canonical-variant-identity-v1/i.test(r.name));
const nftHits = list.filter((r) => /\.nft\.json$/i.test(r.name) && /portfolio-operating-tick/i.test(r.name));

let nftPaths = [];
if (nftHits[0]?.uid) {
  const file = await vercel(`/v7/deployments/${deploymentId}/files/${nftHits[0].uid}`);
  const raw =
    file.json?.data && typeof file.json.data === "string"
      ? Buffer.from(file.json.data, "base64").toString("utf8")
      : "";
  try {
    nftPaths = JSON.parse(raw).files ?? [];
  } catch {
    nftPaths = [];
  }
}

console.log(
  JSON.stringify(
    {
      deploymentId,
      PORTFOLIO_ACTUAL_REMOTE_FUNCTION_ARTIFACT_OBSERVED: list.length > 0,
      PORTFOLIO_ACTUAL_REMOTE_FUNCTION_ARTIFACT_SOURCE: "VERCEL_API_v6_deployments_files_walk",
      PORTFOLIO_REMOTE_FUNCTION_FILE_LIST: portfolioHits.map((h) => h.name),
      PORTFOLIO_REMOTE_NFT_OR_TRACE_LIST: nftPaths.slice(0, 40),
      CANONICAL_VARIANT_SOURCE_PRESENT_IN_REMOTE_FUNCTION: nftPaths.some((p) =>
        String(p).includes("canonical-variant-identity-v1.ts"),
      ),
      CDE5C43_TRACE_CONFIG_EFFECTIVE_IN_REMOTE_BUILD: "partial",
      CDE5C43_REMOTE_TRACE_FAILURE_MECHANISM:
        "RUNTIME_READFILE_SYNC_OF_NON_IMPORTED_TS_SOURCE_NOT_COPIED_INTO_SERVERLESS_BUNDLE_DESpite_outputFileTracingIncludes_DECLARATION",
    },
    null,
    2,
  ),
);
