import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { classifyRoute, evaluatePageDepthBundle, expectedDepthClass } from "../lib/infinity/customer-page-depth";

const composed = composeOccupancynpvPaymentReactivationFiles();
const pages = composed.files.filter((file) => {
  const path = file.path.replace(/\\/g, "/");
  return path.endsWith("page.tsx") && path.startsWith("app/") && !path.startsWith("app/api/");
});
const rows = pages.map((file) => {
  const path = file.path.replace(/\\/g, "/");
  const route = path === "app/page.tsx"
    ? "/"
    : path.replace(/^app/, "").replace(/\/page\.tsx$/, "").replace(/\[id\]/, ":id");
  const pageType = classifyRoute(route);
  const bundle = evaluatePageDepthBundle({ route, html: file.content, pageType, archetype: "calculator" });
  return {
    route,
    path,
    pageType,
    depth: expectedDepthClass(pageType, route),
    q: bundle.question.result,
    gain: bundle.gain.result,
    buy: bundle.decision.result,
    prod: bundle.understanding.result,
    thin: bundle.thinness.result,
    red: bundle.redundancy.result,
    contract: bundle.contract.status,
    missing: bundle.question.reasons,
    bytes: file.content.length,
  };
});
console.log(JSON.stringify(rows, null, 2));
console.log("PAGE_COUNT", rows.length);
