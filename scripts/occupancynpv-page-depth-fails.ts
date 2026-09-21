import { composeOccupancynpvPaymentReactivationFiles } from "../lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { inventoryOccupancynpvVenturePageDepth } from "../lib/infinity/venture-operating-scale/occupancynpv-venture-page-depth";

const summary = inventoryOccupancynpvVenturePageDepth(composeOccupancynpvPaymentReactivationFiles().files);
const failed = summary.pages.filter((row) => row.status === "FAIL" || row.thinness === "FAIL");
console.log(JSON.stringify({
  total: summary.total_material_pages,
  passed: summary.passed,
  failed: summary.failed,
  thin: summary.thin,
  unverified: summary.unverified,
  fails: failed.map((row) => ({
    route: row.route,
    type: row.page_type,
    status: row.status,
    q: row.question_coverage,
    gain: row.information_gain,
    buy: row.buyer_decision_support,
    prod: row.product_understanding,
    thin: row.thinness,
    vis: row.visual_quality,
    missing: row.missing_material_questions,
  })),
}, null, 2));
