import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { occupancynpvVenturePageDepthHqFields } from "../lib/infinity/venture-operating-scale/occupancynpv-venture-page-depth";

const composed = composeOccupancynpvPaymentReactivationFiles();
const hq = occupancynpvVenturePageDepthHqFields(composed.files);
console.log(JSON.stringify({
  total: hq.summary.total_material_pages,
  passed: hq.summary.passed,
  failed: hq.summary.failed,
  thin: hq.summary.thin,
  unverified: hq.summary.unverified,
  rows: hq.display_rows.map((row) => ({
    route: row.route,
    page_type: row.page_type,
    depth_class: row.depth_class,
    q: row.question_coverage,
    prod: row.product_understanding,
    buy: row.buyer_decision_support,
    gain: row.information_gain,
    thin: row.thinness,
    vis: row.visual_quality,
    overall: row.status,
  })),
}, null, 2));
