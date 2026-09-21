import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const audit = JSON.parse(readFileSync(".infinity/opportunity-universe/audit.json", "utf8"));
const candidates = (audit.candidates ?? []).filter((row) => row.classification !== "E2E_FIXTURE");
const originalTen = candidates
  .filter((row) => row.discoveryRunId === "3fd82037-0f03-425a-9212-f683d7cbd41a")
  .sort((a, b) => (a.rankPosition ?? 99) - (b.rankPosition ?? 99))
  .slice(0, 10)
  .map((row, index) => ({
    candidateId: row.id,
    name: row.title,
    rank: index + 1,
    opportunityScore: row.opportunityScore,
    monetizationScore: row.monetizationScore ?? "UNKNOWN",
    reason: "Persisted by opportunity_scanner_v1 run cap of 10.",
  }));
const selectionForty = candidates.slice(0, 40).map((row) => ({
  candidateId: row.id,
  name: row.title,
  rank: row.rank,
  opportunityScore: row.opportunityScore,
  monetizationScore: row.monetizationScore ?? "UNKNOWN",
  reason: "Included in SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1 evaluation set.",
}));

const shortlists = [
  {
    shortlistId: "osl_askreview_discovery_v1",
    version: 1,
    createdAt: "2026-08-17T05:37:34.508Z",
    sourceDiscoveryRunId: "3fd82037-0f03-425a-9212-f683d7cbd41a",
    selectionCriteria: "Opportunity Scanner maxCandidatesPerRun=10 for discovery run 3fd82037-0f03-425a-9212-f683d7cbd41a",
    status: "SUPERSEDED",
    members: originalTen,
    evidenceSnapshot: "Founder-visible cycle shortlist. Not the full historical universe.",
  },
  {
    shortlistId: "osl_second_venture_eval_v2",
    version: 2,
    createdAt: "2026-09-09T06:00:00.000Z",
    sourceDiscoveryRunId: null,
    selectionCriteria: "Merged historical opportunity_candidates ordered by opportunity_score, probe limit 40",
    status: "CURRENT",
    members: selectionForty,
    evidenceSnapshot: "The reported 40 was a query limit over persisted scanner rows, not a 40-candidate discovery run.",
  },
];

const attention = {
  kind: "NEW_OPPORTUNITIES",
  message: `${Math.max(0, candidates.length - 10)} opportunities were hidden from the previous HQ Top-10/cycle view. Current canonical universe: ${candidates.length}.`,
};

mkdirSync(".infinity/opportunity-universe", { recursive: true });
writeFileSync(".infinity/opportunity-universe/shortlists.json", `${JSON.stringify({ shortlists }, null, 2)}\n`);
writeFileSync(".infinity/opportunity-universe/attention.json", `${JSON.stringify(attention, null, 2)}\n`);
writeFileSync(".infinity/opportunity-universe/selection-forty.json", `${JSON.stringify(selectionForty, null, 2)}\n`);
writeFileSync(".infinity/opportunity-universe/original-ten.json", `${JSON.stringify(originalTen, null, 2)}\n`);

const recordsPath = ".infinity/venture-operating-scale/venture-operational-records.json";
const parsed = JSON.parse(readFileSync(recordsPath, "utf8"));
const ask = (parsed.records ?? []).find((row) => row.venture_id === "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e");
if (ask) {
  ask.operating_stage = "VALIDATING";
  ask.latest_learning_decision = "SELECTION_UNDER_REVIEW";
  ask.current_missions = ["SECOND_VENTURE_SELECTION_PROVENANCE_REVIEW"];
  ask.blocked_actions = Array.from(new Set([
    ...(ask.blocked_actions ?? []),
    "ASKREVIEW_PRODUCTION_PAUSED",
  ]));
  writeFileSync(recordsPath, `${JSON.stringify(parsed, null, 2)}\n`);
}

console.log(JSON.stringify({
  originalTen: originalTen.length,
  selectionForty: selectionForty.length,
  universe: candidates.length,
  originalTenNames: originalTen.map((row) => row.name),
}, null, 2));
