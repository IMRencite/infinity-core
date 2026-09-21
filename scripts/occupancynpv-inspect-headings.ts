import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";

const composed = composeOccupancynpvPaymentReactivationFiles();
const want = [
  "app/page.tsx",
  "app/how-it-works/page.tsx",
  "app/compare-commercial-leases/page.tsx",
  "app/faq/page.tsx",
  "app/resources/page.tsx",
];
for (const path of want) {
  const file = composed.files.find((row) => row.path.replace(/\\/g, "/") === path);
  const text = file?.content ?? "";
  const headings = [...text.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((row) => row[1]);
  console.log(JSON.stringify({
    path,
    bytes: text.length,
    headings: headings.slice(0, 16),
    related: /Related product paths/i.test(text),
    support: /infinitemediaresources/i.test(text),
    trial: /3-day/i.test(text),
    notFor: (text.match(/Who OccupancyNPV is not for|Who should not use it|Who is this not for/gi) ?? []).length,
  }));
}
