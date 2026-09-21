import { reconstructOccupancynpvLegalSurfaceSuccessor } from "../lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";

const notBuilt = /if the product is built|not a finished product|not generally available|validation-stage|not a live product|proposed early-access \/ pilot concept/i;
const noPayment = /payment is not collected|this site does not collect payment(?! card)|does not collect payment(?! card)/i;
const pilot = /validation \/ pilot concept|pilot concept|not generally available/i;

const files = reconstructOccupancynpvLegalSurfaceSuccessor().files.filter((file) => {
  const path = file.path.replace(/\\/g, "/");
  return path.endsWith("page.tsx") && !path.startsWith("app/api/") && !path.startsWith("app/occupancynpv/");
});
const routes: string[] = [];
let notBuiltCount = 0;
let noPaymentCount = 0;
let pilotCount = 0;
for (const file of files) {
  const route = "/" + file.path.replace(/\\/g, "/").replace(/^app\//, "").replace(/\/page\.tsx$/, "").replace(/\/index$/, "");
  const pageRoute = route === "/page" || route === "/" ? "/" : route.replace(/\/$/, "") || "/";
  let hit = false;
  if (notBuilt.test(file.content)) { notBuiltCount += 1; hit = true; }
  if (noPayment.test(file.content)) { noPaymentCount += 1; hit = true; }
  if (pilot.test(file.content)) { pilotCount += 1; hit = true; }
  if (hit) routes.push(pageRoute === "/." ? "/" : pageRoute);
}
console.log(JSON.stringify({
  routesSearched: files.length,
  routesWithStale: routes.length,
  notBuiltClaims: notBuiltCount,
  noPaymentClaims: noPaymentCount,
  pilotOnlyContradictions: pilotCount,
  routes,
}, null, 2));
