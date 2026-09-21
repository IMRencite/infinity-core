import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { classifyRoute, evaluatePageDepthBundle } from "../lib/infinity/customer-page-depth";
import { routeFromComposedPath } from "../lib/infinity/venture-operating-scale/occupancynpv-venture-page-depth";

const routes = [
  "/tenant-improvement-allowance",
  "/discount-rate-sensitivity",
  "/resources/cam-costs",
  "/faq",
  "/early-access",
  "/how-it-works",
  "/",
];
const files = composeOccupancynpvPaymentReactivationFiles().files;
for (const route of routes) {
  const file = files.find((row) => routeFromComposedPath(row.path) === route);
  const html = file?.content ?? "";
  const bundle = evaluatePageDepthBundle({ route, html, pageType: classifyRoute(route), archetype: "calculator" });
  console.log(JSON.stringify({
    route,
    path: file?.path,
    bytes: html.length,
    h1: /<h1/i.test(html),
    missing: bundle.question.reasons,
    red: bundle.redundancy.reasons,
    vis: bundle.visual.reasons,
    contract: bundle.contract.missing_dimensions,
  }));
}
