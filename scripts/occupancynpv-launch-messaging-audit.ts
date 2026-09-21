import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { reconstructOccupancynpvLegalSurfaceSuccessor } from "../lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";

const stale = /if the product is built|not a finished product|not generally available|payment is not collected|this site does not collect payment(?! card)|validation-stage|proposed early-access \/ pilot concept|Checkout is not open\.|does not collect payment(?! card)/i;

const composed = composeOccupancynpvPaymentReactivationFiles();
const hits: string[] = [];
for (const file of composed.files) {
  const path = file.path.replace(/\\/g, "/");
  if (path.startsWith("app/api/") || path.startsWith("app/occupancynpv/") || path.startsWith("lib/occupancynpv/")) continue;
  file.content.split("\n").forEach((line, index) => {
    if (stale.test(line)) hits.push(`${path}:${index + 1}:${line.trim().slice(0, 200)}`);
  });
}
const pages = composed.files.filter((file) => {
  const path = file.path.replace(/\\/g, "/");
  return path.endsWith("page.tsx") && !path.includes("occupancynpv") && !path.includes("api/");
});
console.log(JSON.stringify({
  digest: composed.digest,
  artifactId: composed.artifactId,
  publicPages: pages.length,
  staleHits: hits.length,
  hits: hits.slice(0, 120),
  legalDigest: reconstructOccupancynpvLegalSurfaceSuccessor().digest,
}, null, 2));
