import { fetchPublicHtml, composeOccupancyNpvOrganicLiveFiles } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { FIRST_LEASE_INPUTS_ROUTE } from "../lib/infinity/organic-growth-engine/obligation/opportunity";

async function main() {
  const composed = composeOccupancyNpvOrganicLiveFiles();
  const page = composed.files.find((file) => file.path.replace(/\\/g, "/").includes("what-numbers-do-you-need"));
  const liveUrl = `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE.replace(/\/+$/, "")}/`;
  const live = await fetchPublicHtml(liveUrl);
  const hay = `${live.body}`;
  console.log(JSON.stringify({
    composed_only_rent: /only need rent to compare/i.test(page?.content ?? ""),
    composed_toc: /pv-toc/.test(page?.content ?? ""),
    live_status: live.status,
    live_len: hay.length,
    live_only_rent: /only need rent/i.test(hay),
    live_toc: /On this page|pv-toc/i.test(hay),
    live_lease_term: /lease terms should you gather/i.test(hay),
    live_lower: /lower rent still cost more/i.test(hay),
    live_direct: /Rent alone is not a comparison/i.test(hay),
  }, null, 2));
}

void main();
