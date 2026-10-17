export type DemandSignalKind =
  | "OBSERVED_QUERY"
  | "VOC_SIGNAL"
  | "REPEATED_QUESTION"
  | "RELATED_SEARCH_INTENT"
  | "INFERRED_RELATED_INTENT"
  | "COMMERCIAL_INTENT"
  | "TOPIC_GAP";

export type SearchDemandEvidence = {
  primary_query: string;
  signals: Array<{ kind: DemandSignalKind; source: string; note: string }>;
  primary_intent: "INFORMATIONAL" | "PROBLEM_AWARE" | "SOLUTION_AWARE" | "COMPARISON" | "DECISION_SUPPORT";
  journey_note: string;
  evidence_summary?: string;
};

export const CLUB_THROTTLE_SHIRT_SEARCH_DEMAND: SearchDemandEvidence = {
  primary_query: "how riders choose a shirt that survives the ride home",
  evidence_summary:
    "Repeat rider-apparel questions in Club Throttle journal/support patterns (fit on bars, print after wash, weight/GSM); adjacent demand from night-ride and streetwear-vs-gear readers.",
  signals: [
    {
      kind: "VOC_SIGNAL",
      source: "Repeat founder/journal apparel questions (fit, collar, wash, print)",
      note: "Riders ask how a tee should fit on the bike and whether graphics survive laundry.",
    },
    {
      kind: "REPEATED_QUESTION",
      source: "Shop/journal consideration path",
      note: "What GSM/weight, how should it fit on the bike, will the print survive wash.",
    },
    {
      kind: "INFERRED_RELATED_INTENT",
      source: "Adjacent journal topics (night ride, streetwear vs gear, bike-night culture)",
      note: "Readers comparing layers, print visibility at stops, tee vs hoodie for bike night.",
    },
    {
      kind: "COMMERCIAL_INTENT",
      source: "Journal → shop/collection consideration",
      note: "Reader learning before graphic streetwear purchase.",
    },
  ],
  primary_intent: "DECISION_SUPPORT",
  journey_note: "Problem-aware rider evaluating blank quality before repeat purchase.",
};

export type QuestionClusterPlan = {
  core_question: string;
  supporting: Array<{ question: string; coverage: "MUST_ANSWER_HERE" | "SUPPORT_BRIEFLY" | "LINK_DEEPER" | "OUT_OF_SCOPE" }>;
};

export const CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER: QuestionClusterPlan = {
  core_question: "How do riders choose a shirt that still works after the ride, the stop, and the first wash?",
  supporting: [
    { question: "What shirt weight works for riding and bike nights?", coverage: "MUST_ANSWER_HERE" },
    { question: "How should a rider tee fit when reaching for the bars?", coverage: "MUST_ANSWER_HERE" },
    { question: "Why does collar and hem matter off the bike?", coverage: "MUST_ANSWER_HERE" },
    { question: "How do you check print placement for bike-night visibility?", coverage: "MUST_ANSWER_HERE" },
    { question: "What happens to graphic tees in the first wash?", coverage: "MUST_ANSWER_HERE" },
    { question: "Cotton vs blend for humid nights?", coverage: "SUPPORT_BRIEFLY" },
    { question: "Screen print vs DTG for durability?", coverage: "SUPPORT_BRIEFLY" },
    { question: "Tee vs hoodie for the ride home?", coverage: "SUPPORT_BRIEFLY" },
    { question: "Is lifestyle motorcycle apparel protective gear?", coverage: "SUPPORT_BRIEFLY" },
    { question: "Full size-chart tutorial?", coverage: "LINK_DEEPER" },
  ],
};

export const CLUB_THROTTLE_SHIRT_TOPIC_GRAPH_LINKS = [
  "/journal/apparel/streetwear-vs-riding-gear/",
  "/journal/night-riding/how-to-ride-after-dark/",
  "/journal/culture/bike-night-etiquette/",
  "/journal/rides/group-ride-etiquette/",
] as const;
