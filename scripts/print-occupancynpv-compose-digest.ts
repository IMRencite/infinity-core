import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";

const composed = composeOccupancynpvPaymentReactivationFiles();
const form = composed.files.find((file) => file.path.replace(/\\/g, "/") === "components/occupancynpv-public-improvement-form.tsx")?.content ?? "";
const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
console.log(JSON.stringify({
  digest: composed.digest,
  artifactId: composed.artifactId,
  hasCta: form.includes("vg-cta vg-cta--primary"),
  hasTextarea: form.includes("vg-textarea"),
  hasInput: form.includes("vg-input"),
  cssHasImprovement: css.includes("occupancynpv-improvement-form"),
  fileCount: composed.files.length,
}, null, 2));
