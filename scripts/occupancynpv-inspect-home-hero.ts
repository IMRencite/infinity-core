import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";

const html = composeOccupancynpvPaymentReactivationFiles().files
  .find((file) => file.path.replace(/\\/g, "/") === "app/page.tsx")?.content ?? "";
const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
console.log(header.slice(0, 4500));
console.log("\n---HEADER_LEN", header.length);
console.log("offer_inside_header", header.includes("onpv-page-depth"));
console.log("see_pricing", (html.match(/See pricing/g) ?? []).length);
