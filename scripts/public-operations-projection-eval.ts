import { writeFileSync, mkdirSync } from "node:fs";
import {
  evaluatePublicProjectionGateBundle,
  projectPublicOperations,
  stringifyPublicProjection,
} from "../lib/infinity/public-operations-projection";

const projection = projectPublicOperations({ useCache: false });
const text = stringifyPublicProjection(projection);
const forbidden = [
  "@",
  "$50",
  "localhost",
  "C:\\",
  "acct_",
  "sk_",
  "Bearer",
  "Mercury",
  "spend authority",
  "commitment",
  "customer",
  "/api/internal",
];
const hits = forbidden.filter((needle) => text.includes(needle));
const gates = evaluatePublicProjectionGateBundle({
  projection,
  started: Number(projection.ventures_started_count),
  operating: Number(projection.ventures_operating_count),
  completed: Number(projection.missions_completed_count),
  loopActive: projection.public_activity_summary === "ACTIVE",
});
const payload = {
  projection,
  forbidden_hits: hits,
  gates,
};
mkdirSync(".qc-runtime", { recursive: true });
writeFileSync(".qc-runtime/public-operations-projection-eval.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
