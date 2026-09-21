import { executeOccupancyNpvOrganicLiveProof } from "../lib/infinity/organic-growth-engine/continuous/live-proof";

async function main() {
  const deploy = process.argv.includes("--deploy");
  const result = await executeOccupancyNpvOrganicLiveProof({ deploy });
  const report = result.report;
  console.log(JSON.stringify({
    question: report.question,
    url: report.url,
    live_url: report.live_url,
    authorized: result.prepared.authorization.result,
    deployed: report.deploy.deployed,
    http: report.deploy.status,
    live_publishing: report.gates.live_publishing.result,
    live_url_truth: report.gates.live_url_truth.result,
    persistence: report.gates.persistence.result,
    sales: report.gates.sales.result,
    safe_error: report.deploy.safe_error,
    published: report.published,
  }, null, 2));
  if (!report.published) process.exitCode = 1;
}

void main();
