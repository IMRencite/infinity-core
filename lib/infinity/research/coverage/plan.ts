import type { EvidenceSignalType } from "../constants";
import {
  DIMENSION_RESEARCH_CLASS,
  DIMENSION_SIGNAL_TYPES,
  MATERIAL_RESEARCH_DIMENSIONS,
  RESEARCH_EVIDENCE_DIMENSIONS,
  isDirectExternalResearchUseful,
  type ResearchEvidenceDimension,
} from "./dimensions";
import type { ResearchCoveragePolicy } from "./policy";
import {
  candidateQueriesForDimension,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "./queries";

export const DIMENSION_QUERY_INTENTS: Record<ResearchEvidenceDimension, string> = {
  demand: "customer problem frequency / search interest / recurring pain",
  market: "category size / growth / adoption / technology shift",
  competition: "competitor existence / positioning / pricing / complaints",
  pricing: "market pricing / competitor pricing / willingness-to-pay proxies",
  monetization: "existing category monetization models / comparable business models",
  distribution: "observable acquisition channels / marketplace/channel behavior",
  buildability: "required integrations / platform constraints / comparable implementations",
  capital_efficiency: "observable provider/platform/vendor costs",
  speed_to_revenue: "sales-cycle / onboarding / deployment / purchase-cycle proxies",
};

const SECONDARY_DIMENSION_ORDER: ResearchEvidenceDimension[] = [
  "pricing",
  "distribution",
  "buildability",
  "capital_efficiency",
  "speed_to_revenue",
];

export type PlannedDimensionTarget = {
  dimension: ResearchEvidenceDimension;
  researchClass: (typeof DIMENSION_RESEARCH_CLASS)[ResearchEvidenceDimension];
  targetSignalTypes: EvidenceSignalType[];
  priority: number;
  directExternalResearchUseful: boolean;
  queryIntent: string;
  maxQueries: number;
};

export type PlannedResearchStep = {
  stepId: string;
  phase: "initial" | "gap_fill";
  targetDimensions: ResearchEvidenceDimension[];
  targetSignalTypes: EvidenceSignalType[];
  queries: PlannedResearchQuery[];
  priority: number;
  groundingRequired: true;
  sourceBackedFindingsRequired: boolean;
};

export type ResearchCoveragePlan = {
  dimensions: PlannedDimensionTarget[];
  steps: PlannedResearchStep[];
  maxInitialQueries: number;
  maxGapFillQueries: number;
  maxFindings: number;
  maxLogicalPhases: 2;
};

export function buildResearchCoveragePlan(input: {
  seed?: ResearchCoverageSeed;
  objective?: string;
  policy: ResearchCoveragePolicy;
  requireSourceBackedFindings?: boolean;
}): ResearchCoveragePlan {
  const seed = input.seed ?? {};
  const dimensions = RESEARCH_EVIDENCE_DIMENSIONS.map((dimension, index) => ({
    dimension,
    researchClass: DIMENSION_RESEARCH_CLASS[dimension],
    targetSignalTypes: DIMENSION_SIGNAL_TYPES[dimension],
    priority: index + 1,
    directExternalResearchUseful: isDirectExternalResearchUseful(dimension),
    queryIntent: DIMENSION_QUERY_INTENTS[dimension],
    maxQueries: dimension === "competition" ? 2 : 1,
  }));

  const reserved = MATERIAL_RESEARCH_DIMENSIONS.flatMap((dimension) => {
    const available = candidateQueriesForDimension(dimension, seed, input.objective ?? "");
    const take = dimension === "competition" ? Math.min(2, available.length) : 1;
    return available.slice(0, take);
  });
  const extras = [
    ...MATERIAL_RESEARCH_DIMENSIONS.flatMap((dimension) =>
      candidateQueriesForDimension(dimension, seed, input.objective ?? "").slice(dimension === "competition" ? 2 : 1),
    ),
    ...SECONDARY_DIMENSION_ORDER.flatMap((dimension) =>
      candidateQueriesForDimension(dimension, seed, input.objective ?? ""),
    ),
  ];
  const queries = [
    ...selectBoundedQueries(reserved, [], input.policy.maxInitialQueries),
    ...selectBoundedQueries(
      extras,
      reserved.map((query) => query.query),
      Math.max(0, input.policy.maxInitialQueries - reserved.length),
    ),
  ];
  const targetDimensions = [...new Set(queries.flatMap((query) => query.targetDimensions))];
  const targetSignalTypes = [...new Set(queries.flatMap((query) => query.targetSignalTypes))];

  return {
    dimensions,
    steps: [
      {
        stepId: "initial-coverage",
        phase: "initial",
        targetDimensions,
        targetSignalTypes,
        queries,
        priority: 1,
        groundingRequired: true,
        sourceBackedFindingsRequired: Boolean(input.requireSourceBackedFindings),
      },
    ],
    maxInitialQueries: input.policy.maxInitialQueries,
    maxGapFillQueries: input.policy.maxGapFillQueries,
    maxFindings: input.policy.maxFindings,
    maxLogicalPhases: 2,
  };
}
