import { inspectVercelProjectSsoProtection } from "../lib/infinity/launch-gateway/adapters/vercel-deployment-protection";
import { FAILED_CRE_VALIDATION_PROJECT } from "../lib/infinity/market-validation-experiment/constants";
import { LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID, LAST_READY_SOURCE_BUNDLE_URL } from "../lib/infinity/market-validation-experiment/live-validation-failure";
import { loadEnvLocal } from "../lib/infinity/market-validation-experiment/live";
import { VERCEL_TEAM_ID_ENV, VERCEL_TOKEN_ENV } from "../lib/infinity/launch-gateway/provider-config";

loadEnvLocal();

const token = process.env[VERCEL_TOKEN_ENV] ?? null;
const teamId = process.env[VERCEL_TEAM_ID_ENV] ?? null;

const project = await inspectVercelProjectSsoProtection({
  projectName: FAILED_CRE_VALIDATION_PROJECT,
  teamId,
  token,
});

const deployment = await fetch(`https://api.vercel.com/v13/deployments/${LAST_READY_SOURCE_BUNDLE_DEPLOYMENT_ID}${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`, {
  method: "GET",
  headers: {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});
const deploymentBody = (await deployment.json()) as { id?: string; readyState?: string; url?: string };

async function inspectPublic(target: string) {
  const res = await fetch(target, {
    redirect: "manual",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  return {
    url: target,
    status: res.status,
    location: res.headers.get("location"),
    body: text.slice(0, 280),
    protectionPresent: /Protected deployment/i.test(text) || /vercel\.com\/login|vercel\.com\/sso/i.test(`${text} ${res.headers.get("location") ?? ""}`),
    vercelAuthEnabled: /vercel_auth_enabled":true/.test(text),
  };
}

const publicRoot = await inspectPublic(`${LAST_READY_SOURCE_BUNDLE_URL}/`);
const publicIngest = await inspectPublic(
  `${LAST_READY_SOURCE_BUNDLE_URL}/api/public/market-validation/exp_e72beb7b6d35e7b20acf/ingest`,
);

console.log(
  JSON.stringify(
    {
      project,
      deployment: {
        httpStatus: deployment.status,
        id: deploymentBody.id ?? null,
        readyState: deploymentBody.readyState ?? null,
      },
      publicRoot,
      publicIngest,
    },
    null,
    2,
  ),
);
