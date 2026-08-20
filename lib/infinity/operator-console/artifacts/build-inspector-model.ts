import type { DepartmentId } from "../types";
import type { HqWorkArtifact } from "./types";
import { deriveHotTakes } from "./hot-takes";
import { fmtTruth, buildCostLabel } from "../details/financial-truth";
import { founderHotTakesFromMetadata } from "@/lib/infinity/founder-idea-lab/hq/hot-takes";
import { founderIdeaJourney } from "@/lib/infinity/founder-idea-lab/hq/journey";
import type {
  HqArtifactInspectorModel,
  InspectorJourney,
  InspectorJourneyPhase,
  InspectorRelatedItem,
  InspectorSection,
} from "./inspector-types";

const ROOM_LABELS: Partial<Record<DepartmentId, string>> = {
  executive_office: "Command",
  opportunity_lab: "Venture Radar",
  research_department: "Research Grid",
  strategy_finance: "Profit Lab",
  company_operations: "Blueprint Lab",
  quality_control: "Validation Station",
  growth_department: "Growth Nexus",
  creative_studio: "Design Core",
  product_lab: "Creation Lab",
  launch_operations: "Deployment Depot",
  intelligence_center: "Signal Intelligence",
};

export type ArtifactDetailPayload = {
  candidate?: {
    title: string;
    summary: string | null;
    targetCustomer: string | null;
    problem: string | null;
    market: string | null;
    opportunityScore: number | null;
    discoveryStrategies: string[];
    demandEvidence: string[];
    marketEvidence: string[];
    monetizationEvidence: string[];
    competitionEvidence: string[];
    risks: string[];
    unknowns: string[];
  };
  selection?: {
    decision: string;
    selectionScore: number | null;
    monetizationScore: number | null;
    validationScore: number | null;
    buildabilityScore: number | null;
    confidence: number | null;
    fatalAssumptionRisk: number | null;
    expectedRoi: number | null;
    ltvCacRatio: number | null;
    estimatedCapitalRequired: number | null;
    platformDependencyRisk: number | null;
    regulatoryRisk: number | null;
    blockingAssumptions: string[];
    queueReason: string | null;
    recommendedNextAction: string | null;
  };
  monetization?: {
    modelType: string | null;
    modelName: string | null;
    price: string | null;
    monetizationScore: number | null;
    ltvCacRatio: number | null;
    expectedRoi: number | null;
    rationale: string | null;
  };
  research?: {
    objective: string | null;
    provider: string | null;
    model: string | null;
    strategy: string | null;
    grounded: boolean;
    sourceCount: number;
    summary: string | null;
    keyFindings: string[];
    sourceLabels: string[];
  };
  build?: {
    artifactKind: string;
    status: string;
    provider: string | null;
    model: string | null;
    taskTitle: string | null;
    qualityGate: string | null;
    reviewResult: string | null;
    fileCount: number | null;
    contentHash: string | null;
    vercelReadiness: string | null;
    knownCostUsd: number | null;
    costKnown: boolean;
    workspaceMutation: string | null;
    mvpScope: string | null;
    implementationResult: string | null;
  };
  creative?: {
    purpose: string | null;
    channel: string | null;
    provider: string | null;
    model: string | null;
    qualityState: string | null;
    reviewSummary: string | null;
    dimensions: string | null;
    provenance: string | null;
    previewUrl: string | null;
    knownCostUsd: number | null;
    costKnown: boolean;
  };
  growth?: {
    channel: string | null;
    audience: string | null;
    contentIntent: string | null;
    distributionStatus: string | null;
    published: boolean;
    generated: boolean;
    provider: string | null;
    model: string | null;
    knownCostUsd: number | null;
    costKnown: boolean;
  };
  deployment?: {
    target: string | null;
    authorityState: string | null;
    reversibility: string | null;
    actionType: string | null;
    endpoint: string | null;
    deploymentStatus: string | null;
    launchStatus: string | null;
    blockingReason: string | null;
    productionReady: boolean;
    deployed: boolean;
    publiclyLaunched: boolean;
    knownCostUsd: number | null;
    costKnown: boolean;
  };
  performance?: {
    metricName: string | null;
    actualValue: string | null;
    measurementPeriod: string | null;
    isActual: boolean;
    isEstimate: boolean;
    technicalDiagnosis: string | null;
    marketDiagnosis: string | null;
    recommendation: string | null;
    confidence: number | null;
    learningDecision: string | null;
    nextMission: string | null;
    executionSuccess: string | null;
  };
  mission?: {
    objective: string | null;
    currentStage: string | null;
    cycleKey: string | null;
    terminalReason: string | null;
    nextDecision: string | null;
    nextMissionId: string | null;
    knownSpendUsd: number | null;
    spendKnown: boolean;
  };
  treasury?: {
    treasurySource: string;
    bankingProvider: string;
    fundingClass: string;
    mercuryProvider?: string;
    mercuryStatus?: string;
    mercuryEnvironment?: string;
    mercuryLastSync?: string | null;
    mercuryAccountCount?: number;
    mercuryProviderBalance?: string;
    mercuryTransactionFreshness?: string;
    ventureDisplayName?: string | null;
    ventureId?: string | null;
    allocated: string;
    reserved: string;
    committed: string;
    spent: string;
    available: string;
    expectedRevenue: string;
    actualRevenue: string;
    expectedProfit: string;
    actualProfit: string;
    budgetConstraints: Array<{ label: string; allocated: string; available: string; scope: string }>;
    recentFunding: Array<{ amount: string; source: string; memo: string; at: string }>;
    recentAllocations: Array<{ amount: string; note: string; at: string }>;
    relatedActions: Array<{ purpose: string; status: string; amount: string; provider: string }>;
  };
};

function fmt(value: unknown, suffix = "", kind: "estimate" | "actual" | "score" = "score"): string {
  if (value == null || value === "") return fmtTruth(value, suffix, kind);
  if (typeof value === "number") return fmtTruth(value, suffix, kind);
  return String(value);
}

function passFail(actual: number | null | undefined, threshold: number, higherIsPass: boolean): "pass" | "fail" | "neutral" {
  if (actual == null) return "neutral";
  return higherIsPass ? (actual >= threshold ? "pass" : "fail") : actual <= threshold ? "pass" : "fail";
}

function candidateIdFrom(artifact: HqWorkArtifact): string | null {
  if (artifact.artifactType === "opportunity_candidate") return artifact.sourceRecordId;
  const id = artifact.metadata.candidateId;
  return typeof id === "string" ? id : null;
}

function relatedForCandidate(
  candidateId: string,
  allArtifacts: HqWorkArtifact[],
  excludeId: string,
): InspectorRelatedItem[] {
  const groups = new Map<string, { artifact: HqWorkArtifact; count: number }>();

  for (const artifact of allArtifacts) {
    if (artifact.id === excludeId) continue;
    const linked =
      artifact.sourceRecordId === candidateId ||
      artifact.metadata.candidateId === candidateId;
    if (!linked && artifact.artifactType !== "research_packet") continue;
    if (artifact.artifactType === "research_packet" && artifact.roomId === "research_department") continue;

    const key = `${artifact.roomId}:${artifact.artifactType}:${artifact.sourceRecordId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { artifact, count: 1 });
    }
  }

  return [...groups.values()].slice(0, 12).map(({ artifact, count }) => ({
    artifactId: artifact.id,
    title: artifact.title,
    artifactType: artifact.artifactType,
    roomLabel: ROOM_LABELS[artifact.roomId] ?? artifact.roomId,
    count: count > 1 ? count : undefined,
  }));
}

function buildJourney(candidateId: string | null, allArtifacts: HqWorkArtifact[]): InspectorJourney {
  const phases: InspectorJourneyPhase[] = [
    "DISCOVERED",
    "RESEARCHED",
    "MONETIZED",
    "SELECTED",
    "VALIDATED",
    "BUILT",
    "LAUNCHED",
    "MEASURED",
  ];

  const related = candidateId
    ? allArtifacts.filter(
        (a) => a.metadata.candidateId === candidateId || a.sourceRecordId === candidateId,
      )
    : [];

  const has = (types: string[]) => related.some((a) => types.includes(a.artifactType));
  const completeFlags: Record<InspectorJourneyPhase, boolean> = {
    DISCOVERED: has(["opportunity_candidate"]),
    RESEARCHED: allArtifacts.some(
      (a) =>
        a.artifactType === "research_packet" ||
        a.artifactType === "validation_evidence" ||
        a.artifactType === "source_cluster",
    ),
    MONETIZED: has(["monetization_plan", "unit_economics"]),
    SELECTED: has(["selection_blueprint", "decision"]),
    VALIDATED: has(["assumption", "validation_experiment", "validation_evidence"]),
    BUILT: has(["company_blueprint", "production_artifact", "code_change"]),
    LAUNCHED: has(["deployment"]),
    MEASURED: has(["performance_signal", "learning_decision"]),
  };

  const firstIncomplete = phases.findIndex((p) => !completeFlags[p]);
  const currentIndex = firstIncomplete === -1 ? phases.length - 1 : firstIncomplete;

  return {
    phases: phases.map((phase, index) => ({
      phase,
      complete: completeFlags[phase],
      current: index === currentIndex && !completeFlags[phase],
    })),
  };
}

function buildCandidateSections(
  artifact: HqWorkArtifact,
  detail: ArtifactDetailPayload | undefined,
  allArtifacts: HqWorkArtifact[],
): InspectorSection[] {
  const c = detail?.candidate;
  const sel = detail?.selection;
  const sections: InspectorSection[] = [];

  sections.push({
    id: "overview",
    title: "Overview",
    rows: [
      { label: "Business concept", value: c?.summary ?? artifact.title },
      { label: "Target customer", value: fmt(c?.targetCustomer) },
      { label: "Primary problem", value: fmt(c?.problem) },
      { label: "Market", value: fmt(c?.market) },
      { label: "Candidate score", value: fmt(c?.opportunityScore ?? artifact.metadata.score) },
      {
        label: "Discovery strategy",
        value: c?.discoveryStrategies?.length ? c.discoveryStrategies.join(", ") : "Unavailable",
      },
    ],
  });

  const whyWork = [
    ...(c?.demandEvidence ?? []),
    ...(c?.marketEvidence ?? []),
    ...(c?.monetizationEvidence ?? []),
  ].slice(0, 6);

  sections.push({
    id: "why-work",
    title: "Why this could work",
    emptyMessage: "No persisted market evidence summary yet.",
    rows: [],
    bullets: whyWork.length > 0 ? whyWork : undefined,
  });

  const whyFail = [...(c?.risks ?? []), ...(c?.unknowns ?? []), ...(sel?.blockingAssumptions ?? [])].slice(0, 6);
  sections.push({
    id: "why-fail",
    title: "Why this could fail",
    emptyMessage: "No persisted adversarial findings yet.",
    rows: [],
    bullets: whyFail.length > 0 ? whyFail : undefined,
  });

  const monetizationArtifacts = allArtifacts.filter(
    (a) =>
      (a.artifactType === "monetization_plan" || a.artifactType === "unit_economics") &&
      a.metadata.candidateId === artifact.sourceRecordId,
  );

  if (monetizationArtifacts.length > 0 || detail?.monetization) {
    const m = detail?.monetization;
    sections.push({
      id: "revenue",
      title: "Revenue plan",
      rows: [
        { label: "Business model", value: fmt(m?.modelType ?? monetizationArtifacts[0]?.title) },
        { label: "Pricing", value: fmt(m?.price ?? monetizationArtifacts[0]?.subtitle) },
        { label: "Expected ROI", value: fmt(m?.expectedRoi ?? sel?.expectedRoi, "", "estimate") },
        { label: "LTV:CAC", value: fmt(m?.ltvCacRatio ?? sel?.ltvCacRatio, "", "estimate") },
        { label: "Monetization score", value: fmt(m?.monetizationScore ?? artifact.metadata.monetizationScore) },
      ],
    });
  } else {
    sections.push({
      id: "revenue",
      title: "Revenue plan",
      emptyMessage: "Not generated yet.",
      rows: [],
    });
  }

  if (sel) {
    sections.push({
      id: "build-gate",
      title: "BUILD gate",
      rows: [
        { label: "Selection score", value: fmt(sel.selectionScore) },
        { label: "Monetization score", value: fmt(sel.monetizationScore) },
        { label: "Validation score", value: fmt(sel.validationScore) },
        { label: "Buildability score", value: fmt(sel.buildabilityScore) },
        { label: "Confidence", value: fmt(sel.confidence) },
        {
          label: "Fatal assumption risk",
          value: fmt(sel.fatalAssumptionRisk),
          tone: passFail(sel.fatalAssumptionRisk, 0.45, false),
        },
        { label: "Platform dependency risk", value: fmt(sel.platformDependencyRisk) },
        { label: "Regulatory risk", value: fmt(sel.regulatoryRisk) },
        { label: "Capital required", value: fmt(sel.estimatedCapitalRequired) },
        { label: "Expected ROI", value: fmt(sel.expectedRoi) },
        { label: "LTV:CAC", value: fmt(sel.ltvCacRatio) },
      ],
    });
  }

  const validationItems = allArtifacts.filter(
    (a) =>
      a.roomId === "quality_control" &&
      a.metadata.candidateId === artifact.sourceRecordId &&
      ["assumption", "validation_evidence", "validation_experiment", "decision"].includes(a.artifactType),
  );

  if (validationItems.length > 0) {
    sections.push({
      id: "validation",
      title: "Validation history",
      rows: validationItems.slice(0, 8).map((v) => ({
        label: v.artifactType.replace(/_/g, " "),
        value: [v.title, v.subtitle, v.metadata.validationResult, v.metadata.fatalRiskBefore != null
          ? `${Number(v.metadata.fatalRiskBefore).toFixed(2)} → ${Number(v.metadata.fatalRiskAfter ?? v.metadata.fatalRiskBefore).toFixed(2)}`
          : null].filter(Boolean).join(" · "),
      })),
    });
  } else {
    sections.push({
      id: "validation",
      title: "Validation",
      emptyMessage: "This candidate has not entered Validation Station.",
      rows: [],
    });
  }

  return sections;
}

function providerReadinessInspector(artifact: HqWorkArtifact): {
  summary: string;
  sections: InspectorSection[];
} {
  return {
    summary: `${artifact.title} is ${String(artifact.metadata.displayStatus ?? "NOT CONFIGURED")}. Mutation authority remains LOCKED.`,
    sections: [
      {
        id: "overview",
        title: "Provider readiness",
        rows: [
          { label: "Provider", value: fmt(artifact.metadata.provider) },
          { label: "Environment", value: fmt(artifact.metadata.environment) },
          { label: "Capabilities", value: fmt(artifact.metadata.capabilities) },
          { label: "Verification timestamp", value: fmt(artifact.metadata.verifiedAt) },
          { label: "Freshness", value: fmt(artifact.metadata.freshness) },
          { label: "Readiness", value: fmt(artifact.metadata.readiness) },
          { label: "Blocking reason", value: fmt(artifact.metadata.blockingReason) },
          { label: "Mutation authority", value: fmt(artifact.metadata.mutationAuthority) },
          { label: "Mode", value: fmt(artifact.metadata.mode) },
        ],
      },
      {
        id: "system",
        title: "System View",
        rows: [
          { label: "Provider key", value: fmt(artifact.metadata.providerKey) },
          { label: "Verification ID", value: fmt(artifact.metadata.verificationId) },
          { label: "Environment", value: fmt(artifact.metadata.environment) },
          { label: "Mode", value: fmt(artifact.metadata.mode) },
          { label: "Capability names", value: fmt(artifact.metadata.capabilities) },
          { label: "Verified at", value: fmt(artifact.metadata.verifiedAt) },
          { label: "Failure code", value: fmt(artifact.metadata.failureCode) },
          { label: "Freshness", value: fmt(artifact.metadata.freshness) },
        ],
      },
    ],
  };
}

export function buildArtifactInspectorModel(
  artifact: HqWorkArtifact,
  allArtifacts: HqWorkArtifact[],
  detail?: ArtifactDetailPayload,
): HqArtifactInspectorModel {
  const candidateId = candidateIdFrom(artifact);
  const relatedWork = candidateId
    ? relatedForCandidate(candidateId, allArtifacts, artifact.id)
    : artifact.artifactType === "research_packet" || artifact.artifactType === "source_cluster"
      ? []
      : [];

  let summary = "";
  let sections: InspectorSection[] = [];
  let decision: string | null = null;
  let decisionWhy: string | null = null;
  let journeyOverride: InspectorJourney | null = null;
  let hotTakesOverride: string[] | null = null;

  if (artifact.sourceRecordType === "provider_readiness") {
    const built = providerReadinessInspector(artifact);
    summary = built.summary;
    sections = built.sections;
    decision = "MUTATION AUTHORITY LOCKED";
    decisionWhy = "Read-only provider verification does not authorize writes.";
  } else {
    switch (artifact.artifactType) {
    case "opportunity_candidate": {
      const c = detail?.candidate;
      summary =
        c?.summary ??
        "Infinity has not produced a detailed business summary for this candidate yet.";
      sections = buildCandidateSections(artifact, detail, allArtifacts);
      decision = detail?.selection?.decision ?? null;
      if (detail?.selection?.queueReason) decisionWhy = detail.selection.queueReason;
      else if (detail?.selection?.recommendedNextAction) decisionWhy = detail.selection.recommendedNextAction;
      break;
    }
    case "research_packet": {
      const r = detail?.research;
      summary = r?.summary ?? r?.objective ?? artifact.title;
      sections = [
        {
          id: "research",
          title: "Research",
          rows: [
            { label: "Objective", value: fmt(r?.objective) },
            { label: "Strategy", value: fmt(r?.strategy ?? artifact.metadata.strategy) },
            { label: "Provider", value: fmt(r?.provider ?? artifact.metadata.provider) },
            { label: "Model", value: fmt(r?.model) },
            { label: "Grounded", value: r?.grounded || artifact.metadata.grounded ? "Yes" : "No" },
            { label: "Source count", value: fmt(r?.sourceCount ?? artifact.metadata.sourceCount) },
          ],
          bullets: r?.keyFindings?.length ? r.keyFindings : undefined,
        },
      ];
      break;
    }
    case "source_cluster": {
      summary = `${artifact.title} — grounded source cluster from persisted research.`;
      sections = [
        {
          id: "sources",
          title: "Source cluster",
          rows: [
            { label: "Unique sources", value: fmt(artifact.metadata.sourceCount) },
            { label: "Grounded", value: artifact.metadata.grounded ? "Yes" : "Unavailable" },
            { label: "Research run", value: fmt(artifact.metadata.researchRunId ?? artifact.sourceRecordId) },
            {
              label: "Lineage",
              value: artifact.lineageColorKey ? `Candidate ${artifact.lineageLabel ?? ""}` : "Shared / General Research",
            },
          ],
          bullets: detail?.research?.sourceLabels,
        },
      ];
      break;
    }
    case "monetization_plan":
    case "unit_economics": {
      const m = detail?.monetization;
      summary = m?.rationale ?? `${artifact.title} — ${artifact.subtitle ?? "monetization output"}`;
      sections = [
        {
          id: "economics",
          title: "Monetization",
          rows: [
            { label: "Candidate", value: artifact.lineageLabel ? `Candidate ${artifact.lineageLabel}` : fmt(artifact.metadata.candidateId) },
            { label: "Business model", value: fmt(m?.modelType ?? artifact.title) },
            { label: "Pricing", value: fmt(m?.price ?? artifact.subtitle) },
            { label: "Expected ROI", value: fmt(m?.expectedRoi ?? artifact.metadata.expectedRoi) },
            { label: "LTV:CAC", value: fmt(m?.ltvCacRatio ?? artifact.metadata.ltvCacRatio) },
            { label: "Monetization score", value: fmt(m?.monetizationScore ?? artifact.metadata.monetizationScore) },
          ],
        },
      ];
      break;
    }
    case "selection_blueprint":
    case "decision": {
      const sel = detail?.selection;
      decision = String(artifact.metadata.decision ?? sel?.decision ?? artifact.title);
      decisionWhy = sel?.queueReason ?? sel?.recommendedNextAction ?? null;
      summary = sel
        ? `Selection evaluation for ${artifact.title} — decision ${decision}.`
        : artifact.subtitle ?? artifact.title;
      sections = sel
        ? buildCandidateSections(
            {
              ...artifact,
              sourceRecordId: String(artifact.metadata.candidateId ?? artifact.sourceRecordId),
            },
            detail,
            allArtifacts,
          ).filter((s) => ["overview", "build-gate", "validation", "revenue"].includes(s.id))
        : [
            {
              id: "selection",
              title: "Selection",
              rows: [
                { label: "Decision", value: decision ?? "Unavailable" },
                { label: "Score", value: fmt(artifact.metadata.score) },
              ],
            },
          ];
      break;
    }
    case "assumption":
      summary = artifact.title;
      sections = [
        {
          id: "assumption",
          title: "Blocking assumption",
          rows: [
            { label: "Assumption", value: artifact.title },
            { label: "Category", value: fmt(artifact.metadata.assumptionCategory) },
            { label: "Fatal risk (before)", value: fmt(artifact.metadata.fatalRiskBefore) },
            { label: "Validation status", value: artifact.state },
          ],
        },
      ];
      break;
    case "validation_evidence":
      summary = artifact.title;
      sections = [
        {
          id: "evidence",
          title: "Validation evidence",
          rows: [
            { label: "Relevance", value: fmt(artifact.metadata.relevance) },
            { label: "Result", value: fmt(artifact.metadata.validationResult) },
            { label: "New sources", value: fmt(artifact.metadata.newSourceCount) },
            { label: "Provider", value: fmt(artifact.metadata.provider) },
            { label: "Research run", value: fmt(artifact.metadata.researchRunId) },
            {
              label: "Fatal risk delta",
              value:
                artifact.metadata.fatalRiskBefore != null
                  ? `${Number(artifact.metadata.fatalRiskBefore).toFixed(2)} → ${Number(artifact.metadata.fatalRiskAfter ?? artifact.metadata.fatalRiskBefore).toFixed(2)}`
                  : "Unavailable",
            },
          ],
        },
      ];
      break;
    case "production_artifact":
    case "code_change":
    case "company_blueprint": {
      const b = detail?.build;
      summary = b?.implementationResult ?? b?.mvpScope ?? artifact.subtitle ?? artifact.title;
      if (!b && artifact.state === "READY") {
        summary = artifact.subtitle ?? artifact.title;
      } else if (!b) {
        summary = "Build entity referenced — persisted detail not yet loaded.";
      }
      sections = b
        ? [
            {
              id: "build-output",
              title: "Build output",
              rows: [
                { label: "Artifact kind", value: b.artifactKind },
                { label: "Status", value: b.status },
                { label: "Task", value: fmt(b.taskTitle) },
                { label: "MVP scope", value: fmt(b.mvpScope) },
                { label: "Provider", value: fmt(b.provider) },
                { label: "Model", value: fmt(b.model) },
                { label: "Quality gate", value: fmt(b.qualityGate) },
                { label: "Review", value: fmt(b.reviewResult) },
                { label: "Files", value: b.fileCount != null ? String(b.fileCount) : "NOT YET CREATED" },
                { label: "Content hash", value: fmt(b.contentHash) },
                { label: "Vercel readiness", value: fmt(b.vercelReadiness) },
                { label: "Cost", value: buildCostLabel(b.knownCostUsd, b.costKnown) },
              ],
            },
            ...(b.workspaceMutation
              ? [{ id: "build-mutation", title: "Workspace mutation", rows: [{ label: "Summary", value: b.workspaceMutation }] }]
              : []),
          ]
        : [
            {
              id: "build-output",
              title: "Build output",
              emptyMessage: "NOT YET CREATED",
              rows: [
                { label: "Type", value: artifact.artifactType },
                { label: "State", value: artifact.state },
              ],
            },
          ];
      break;
    }
    case "creative_asset": {
      const c = detail?.creative;
      summary = c?.purpose ?? artifact.title;
      sections = c
        ? [
            {
              id: "creative-output",
              title: "Creative asset",
              rows: [
                { label: "Purpose", value: fmt(c.purpose) },
                { label: "Channel", value: fmt(c.channel) },
                { label: "Provider", value: fmt(c.provider) },
                { label: "Model", value: fmt(c.model) },
                { label: "Quality", value: fmt(c.qualityState) },
                { label: "Review", value: fmt(c.reviewSummary) },
                { label: "Dimensions", value: fmt(c.dimensions) },
                { label: "Provenance", value: fmt(c.provenance) },
                { label: "Cost", value: buildCostLabel(c.knownCostUsd, c.costKnown) },
              ],
            },
          ]
        : [{ id: "creative-output", title: "Creative asset", emptyMessage: "NOT YET CREATED", rows: [] }];
      break;
    }
    case "content_artifact": {
      const g = detail?.growth;
      summary = g?.contentIntent ?? artifact.title;
      sections = g
        ? [
            {
              id: "growth-output",
              title: "Growth content",
              rows: [
                { label: "Channel", value: fmt(g.channel) },
                { label: "Audience", value: fmt(g.audience) },
                { label: "Intent", value: fmt(g.contentIntent) },
                { label: "Generated", value: g.generated ? "Yes" : "No" },
                { label: "Published", value: g.published ? "Yes" : "No — generated only" },
                { label: "Distribution", value: fmt(g.distributionStatus) },
                { label: "Provider", value: fmt(g.provider) },
                { label: "Model", value: fmt(g.model) },
                { label: "Cost", value: buildCostLabel(g.knownCostUsd, g.costKnown) },
              ],
            },
          ]
        : [{ id: "growth-output", title: "Growth content", emptyMessage: "NOT YET CREATED", rows: [] }];
      break;
    }
    case "deployment": {
      const d = detail?.deployment;
      summary = d?.target ?? artifact.title;
      sections = d
        ? [
            {
              id: "deployment-output",
              title: "Deployment",
              rows: [
                { label: "Target", value: fmt(d.target) },
                { label: "Action type", value: fmt(d.actionType) },
                { label: "Authority", value: fmt(d.authorityState) },
                { label: "Reversibility", value: fmt(d.reversibility) },
                { label: "Production-ready", value: d.productionReady ? "Yes" : "No" },
                { label: "Deployed", value: d.deployed ? "Yes" : "No" },
                { label: "Publicly launched", value: d.publiclyLaunched ? "Yes" : "NOT YET LAUNCHED" },
                { label: "Deployment status", value: fmt(d.deploymentStatus) },
                { label: "Launch status", value: fmt(d.launchStatus) },
                { label: "Endpoint", value: fmt(d.endpoint) },
                { label: "Blocker", value: fmt(d.blockingReason) },
                { label: "Cost", value: buildCostLabel(d.knownCostUsd, d.costKnown) },
              ],
            },
          ]
        : [{ id: "deployment-output", title: "Deployment", emptyMessage: "NOT YET CREATED", rows: [] }];
      break;
    }
    case "performance_signal":
    case "learning_decision": {
      const p = detail?.performance;
      summary = p?.metricName ?? p?.recommendation ?? artifact.title;
      sections = p
        ? [
            {
              id: "performance-output",
              title: "Performance intelligence",
              rows: [
                { label: "Metric", value: fmt(p.metricName) },
                {
                  label: "Value",
                  value: p.isActual ? `${p.actualValue ?? "UNKNOWN"} ACTUAL` : p.isEstimate ? `${p.actualValue ?? "UNKNOWN"} ESTIMATE` : p.actualValue ?? "NOT YET MEASURED",
                },
                { label: "Period", value: fmt(p.measurementPeriod) },
                { label: "Execution success", value: fmt(p.executionSuccess) },
                { label: "Technical diagnosis", value: fmt(p.technicalDiagnosis) },
                { label: "Market diagnosis", value: fmt(p.marketDiagnosis) },
                { label: "Recommendation", value: fmt(p.recommendation) },
                { label: "Confidence", value: fmt(p.confidence) },
                { label: "Learning decision", value: fmt(p.learningDecision) },
                { label: "Next mission", value: fmt(p.nextMission) },
              ],
            },
          ]
        : [{ id: "performance-output", title: "Performance intelligence", emptyMessage: "NOT YET CREATED", rows: [] }];
      break;
    }
    case "mission": {
      const m = detail?.mission;
      summary = m?.objective ?? artifact.title;
      sections = m
        ? [
            {
              id: "mission-command",
              title: "Command mission",
              rows: [
                { label: "Objective", value: fmt(m.objective) },
                { label: "Current stage", value: fmt(m.currentStage) },
                { label: "Cycle key", value: fmt(m.cycleKey) },
                { label: "Terminal reason", value: fmt(m.terminalReason) },
                { label: "Next decision", value: fmt(m.nextDecision) },
                { label: "Next mission", value: fmt(m.nextMissionId) },
                { label: "Budget", value: m.spendKnown ? `$${Number(m.knownSpendUsd).toFixed(2)}` : "UNKNOWN" },
              ],
            },
          ]
        : [{ id: "mission-command", title: "Command mission", rows: [{ label: "Objective", value: artifact.title }] }];
      break;
    }
    case "commercial_domain": {
      summary = artifact.title;
      sections = [
        {
          id: "commercial-domain",
          title: "Domain asset",
          rows: [
            { label: "Domain", value: artifact.title },
            { label: "Registrar", value: fmt(artifact.subtitle) },
            { label: "Status", value: fmt(artifact.metadata.status) },
            {
              label: "Registration price",
              value:
                artifact.metadata.registrationPriceUsd != null
                  ? `$${Number(artifact.metadata.registrationPriceUsd).toFixed(2)}`
                  : "UNKNOWN",
            },
            {
              label: "Renewal price",
              value:
                artifact.metadata.renewalPriceUsd != null
                  ? `$${Number(artifact.metadata.renewalPriceUsd).toFixed(2)} ${String(artifact.metadata.priceTruth ?? "")}`
                  : "UNKNOWN",
            },
            { label: "Verification", value: fmt(artifact.metadata.verificationState) },
          ],
        },
      ];
      break;
    }
    case "treasury_state":
    case "treasury_budget":
    case "venture_capital_allocation":
    case "financial_action":
    case "financial_authorization":
    case "treasury_transaction":
    case "recurring_commitment": {
      const treasury = detail?.treasury;
      const ventureDisplayName =
        treasury?.ventureDisplayName ??
        (typeof artifact.metadata.ventureDisplayName === "string" ? artifact.metadata.ventureDisplayName : null);
      const ventureId =
        treasury?.ventureId ?? (typeof artifact.metadata.ventureId === "string" ? artifact.metadata.ventureId : null);
      const isAllocation = artifact.artifactType === "venture_capital_allocation";
      const candidateId = typeof artifact.metadata.candidateId === "string" ? artifact.metadata.candidateId : null;
      const blueprintId = typeof artifact.metadata.blueprintId === "string" ? artifact.metadata.blueprintId : null;
      summary = artifact.subtitle ?? artifact.title;
      sections = [
        {
          id: "overview",
          title: "Overview",
          rows: [
            { label: isAllocation ? "Venture" : "Entity", value: ventureDisplayName ?? artifact.title },
            ...(ventureId ? [{ label: isAllocation ? "Venture ID" : "ID", value: ventureId }] : []),
            ...(candidateId ? [{ label: "Candidate ID", value: candidateId }] : []),
            ...(blueprintId ? [{ label: "Blueprint ID", value: blueprintId }] : []),
            { label: "Status", value: artifact.state },
            { label: "Treasury source", value: treasury?.treasurySource ?? "Internal manual ledger" },
            { label: "Banking provider", value: treasury?.bankingProvider ?? fmt(artifact.metadata.bankingProvider) },
            { label: "Funding class", value: treasury?.fundingClass ?? "INTERNAL / MANUAL / NON-BANK" },
            { label: "Mercury", value: treasury?.mercuryStatus ?? fmt(artifact.metadata.mercuryStatus) },
            { label: "Mercury environment", value: treasury?.mercuryEnvironment ?? fmt(artifact.metadata.mercuryEnvironment) },
            { label: "Mercury last sync", value: treasury?.mercuryLastSync ?? fmt(artifact.metadata.mercuryLastSync) },
            { label: "Mercury accounts", value: String(treasury?.mercuryAccountCount ?? artifact.metadata.mercuryAccountCount ?? "0") },
            { label: "Mercury provider balance", value: treasury?.mercuryProviderBalance ?? fmt(artifact.metadata.mercuryProviderBalance) },
            ...Object.entries(artifact.metadata)
              .filter(([key]) => !/secret|token|credential|password|card|cvv/i.test(key))
              .filter(([key]) => key !== "ventureDisplayName" && key !== "ventureId" && key !== "candidateId" && key !== "blueprintId" && !key.startsWith("mercury"))
              .map(([label, value]) => ({
                label: label.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
                value: fmt(value),
              })),
          ],
        },
        {
          id: "capital",
          title: "Capital",
          rows: [
            { label: "Allocated capital", value: treasury?.allocated ?? fmt(artifact.metadata.allocated) },
            { label: "Reserved capital", value: treasury?.reserved ?? fmt(artifact.metadata.reserved) },
            { label: "Committed capital", value: treasury?.committed ?? fmt(artifact.metadata.committed) },
            { label: "Spent", value: treasury?.spent ?? fmt(artifact.metadata.spent) },
            { label: "Available capital", value: treasury?.available ?? fmt(artifact.metadata.available) },
            { label: "Expected economics", value: treasury?.expectedRevenue ?? fmt(artifact.metadata.expectedRevenue) },
            { label: "Actual economics", value: treasury?.actualRevenue ?? fmt(artifact.metadata.actualRevenue) },
          ],
        },
        {
          id: "budgets",
          title: "Budget limits",
          rows: (treasury?.budgetConstraints ?? []).length
            ? treasury!.budgetConstraints.map((row) => ({
                label: `${row.scope} ${row.label}`,
                value: `Limit ${row.allocated} · available ${row.available}`,
              }))
            : [{ label: "Budget limits", value: "UNKNOWN" }],
        },
        {
          id: "evidence",
          title: "Evidence",
          rows: [
            { label: "Source record", value: `${artifact.sourceRecordType}:${artifact.sourceRecordId}` },
            { label: "Idempotency", value: fmt(artifact.metadata.idempotencyKey) },
            ...(treasury?.recentFunding ?? []).map((entry) => ({
              label: `Funding ${entry.at}`,
              value: `${entry.amount} · ${entry.source} · ${entry.memo}`,
            })),
            ...(treasury?.recentAllocations ?? []).map((entry) => ({
              label: `Allocation ${entry.at}`,
              value: `${entry.amount} · ${entry.note}`,
            })),
            ...(treasury?.relatedActions ?? []).map((entry) => ({
              label: entry.purpose,
              value: `${entry.status} · ${entry.amount} · ${entry.provider}`,
            })),
          ],
        },
        {
          id: "system",
          title: "System View",
          rows: [
            { label: "Artifact type", value: artifact.artifactType },
            { label: "Room", value: ROOM_LABELS[artifact.roomId] ?? artifact.roomId },
            { label: "Bank transfer", value: "NONE — internal manual ledger only" },
          ],
        },
      ];
      break;
    }
    case "commercial_payment":
    case "commercial_checkout":
    case "commercial_revenue":
    case "commercial_treasury":
    case "commercial_dns": {
      summary = artifact.title;
      sections = [
        {
          id: "commercial-output",
          title: "Commercialization",
          rows: Object.entries(artifact.metadata).map(([label, value]) => ({
            label: label.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
            value: fmt(value),
          })),
        },
      ];
      break;
    }
    case "coding_agent_run":
    case "coding_task":
    case "coding_provider": {
      summary = artifact.subtitle ?? artifact.title;
      journeyOverride = {
        phases: [
          { phase: "DISCOVERED", complete: true, current: false },
          { phase: "BUILT", complete: artifact.state === "READY", current: artifact.state === "CREATING" },
          { phase: "LAUNCHED", complete: false, current: false },
          { phase: "MEASURED", complete: false, current: false },
        ].map((row) => ({ ...row, phase: row.phase as InspectorJourneyPhase })),
      };
      hotTakesOverride = [
        `[FACT] Provider is ${fmt(artifact.metadata.provider)}.`,
        `[FACT] Cursor success is not Infinity acceptance — validation state is ${fmt(artifact.metadata.validationState)}.`,
        `[INFERENCE] Repair attempts so far: ${fmt(artifact.metadata.repairAttempts)}.`,
      ];
      sections = [
        {
          id: "overview",
          title: "Overview",
          rows: [
            { label: "Provider", value: fmt(artifact.metadata.provider) },
            { label: "Execution mode", value: fmt(artifact.metadata.executionMode) },
            { label: "Status", value: fmt(artifact.metadata.status) },
            { label: "Task", value: fmt(artifact.metadata.taskId) },
            { label: "Venture", value: fmt(artifact.metadata.ventureId) },
          ],
        },
        {
          id: "evidence",
          title: "Evidence",
          rows: [
            { label: "Files affected", value: fmt(artifact.metadata.filesAffected) },
            { label: "Tests", value: fmt(artifact.metadata.tests) },
            { label: "Build", value: fmt(artifact.metadata.build) },
            { label: "Known cost", value: fmt(artifact.metadata.knownCost) },
          ],
        },
        {
          id: "system",
          title: "System View",
          rows: [
            { label: "codingAgentRunId", value: fmt(artifact.metadata.codingAgentRunId) },
            { label: "provider", value: fmt(artifact.metadata.provider) },
            { label: "mode", value: fmt(artifact.metadata.executionMode) },
            { label: "taskId", value: fmt(artifact.metadata.taskId) },
            { label: "duration", value: fmt(artifact.metadata.duration) },
            { label: "cost", value: fmt(artifact.metadata.knownCost) },
            { label: "repairAttempts", value: fmt(artifact.metadata.repairAttempts) },
          ],
        },
      ];
      break;
    }
    case "ztp_run": {
      summary = artifact.subtitle ?? artifact.title;
      decision = String(artifact.metadata.businessDecision ?? "") || null;
      journeyOverride = {
        phases: [
          { phase: "DISCOVERED", complete: true, current: false },
          { phase: "RESEARCHED", complete: true, current: false },
          { phase: "MONETIZED", complete: true, current: false },
          { phase: "SELECTED", complete: true, current: false },
          { phase: "BUILT", complete: artifact.metadata.qa === "PASS", current: artifact.metadata.stage === "BUILD" },
          { phase: "LAUNCHED", complete: false, current: false },
          { phase: "MEASURED", complete: false, current: false },
        ].map((row) => ({ ...row, phase: row.phase as InspectorJourneyPhase })),
      };
      hotTakesOverride = [
        `[FACT] Origin is ${fmt(artifact.metadata.origin)}.`,
        `[FACT] READY is not PUBLICLY_LAUNCHED.`,
        `[FACT] Coding provider is ${fmt(artifact.metadata.codingProvider)}.`,
        `[INFERENCE] Launch readiness is ${fmt(artifact.metadata.launchReadiness)}.`,
      ];
      sections = [
        {
          id: "overview",
          title: "Overview",
          rows: [
            { label: "Venture", value: fmt(artifact.metadata.ventureId) },
            { label: "Origin", value: fmt(artifact.metadata.origin) },
            { label: "Business decision", value: fmt(artifact.metadata.businessDecision) },
            { label: "Stage", value: fmt(artifact.metadata.stage) },
            { label: "Progress", value: fmt(artifact.metadata.progress) },
            { label: "Readiness", value: fmt(artifact.metadata.launchReadiness) },
            { label: "Blocker", value: fmt(artifact.metadata.blocker) },
          ],
        },
        {
          id: "insights",
          title: "Insights",
          rows: [
            { label: "Coding provider", value: fmt(artifact.metadata.codingProvider) },
            { label: "QA", value: fmt(artifact.metadata.qa) },
            { label: "Repair attempts", value: fmt(artifact.metadata.repairAttempts) },
            { label: "Cost", value: fmt(artifact.metadata.cost) },
            { label: "Commercialization", value: fmt(artifact.metadata.commercialization) },
          ],
        },
        {
          id: "evidence",
          title: "Evidence",
          rows: [
            { label: "QA", value: fmt(artifact.metadata.qa) },
            { label: "Launch readiness", value: fmt(artifact.metadata.launchReadiness) },
            { label: "Commercialization", value: fmt(artifact.metadata.commercialization) },
          ],
        },
        {
          id: "system",
          title: "System View",
          rows: [
            { label: "ztpRunId", value: fmt(artifact.metadata.ztpRunId) },
            { label: "candidateId", value: fmt(artifact.metadata.candidateId) },
            { label: "ventureId", value: fmt(artifact.metadata.ventureId) },
            { label: "blueprintId", value: fmt(artifact.metadata.blueprintId) },
            { label: "buildPackageId", value: fmt(artifact.metadata.buildPackageId) },
            { label: "buildGraphId", value: fmt(artifact.metadata.buildGraphId) },
            { label: "codingAgentRunIds", value: fmt(artifact.metadata.codingAgentRunIds) },
            { label: "productionArtifactId", value: fmt(artifact.metadata.productionArtifactId) },
            { label: "commercializationPlanId", value: fmt(artifact.metadata.commercializationPlanId) },
            { label: "financialActionRequestIds", value: fmt(artifact.metadata.financialActionRequestIds) },
            { label: "idempotencyKey", value: fmt(artifact.metadata.idempotencyKey) },
            { label: "publiclyLaunched", value: fmt(artifact.metadata.publiclyLaunched) },
            { label: "origin", value: fmt(artifact.metadata.origin) },
            { label: "stage", value: fmt(artifact.metadata.stage) },
            { label: "progress", value: fmt(artifact.metadata.progress) },
            { label: "cost", value: fmt(artifact.metadata.cost) },
          ],
        },
      ];
      break;
    }
    case "founder_idea": {
      summary = String(artifact.metadata.thesis ?? artifact.subtitle ?? artifact.title);
      decision = String(artifact.metadata.infinityDecision ?? "") || null;
      decisionWhy =
        artifact.metadata.overrideFounder != null
          ? `FOUNDER OVERRIDE — Infinity ${artifact.metadata.overrideInfinity ?? artifact.metadata.infinityDecision}; founder ${artifact.metadata.overrideFounder}`
          : null;
      journeyOverride = founderIdeaJourney(artifact);
      hotTakesOverride = founderHotTakesFromMetadata(artifact.metadata);
      sections = [
        {
          id: "overview",
          title: "Overview",
          rows: [
            { label: "Founder-provided idea", value: artifact.title },
            { label: "Thesis", value: fmt(artifact.metadata.thesis) },
            { label: "Thesis source", value: fmt(artifact.metadata.thesisSource) },
            { label: "Customer", value: `${fmt(artifact.metadata.customer)} (${fmt(artifact.metadata.customerSource)})` },
            { label: "Problem", value: `${fmt(artifact.metadata.problem)} (${fmt(artifact.metadata.problemSource)})` },
            { label: "Solution", value: `${fmt(artifact.metadata.solution)} (${fmt(artifact.metadata.solutionSource)})` },
            { label: "Status", value: fmt(artifact.metadata.status) },
            { label: "Origin", value: fmt(artifact.metadata.origin) },
          ],
        },
        {
          id: "insights-scores",
          title: "Scores",
          rows: [
            { label: "Opportunity quality", value: fmt(artifact.metadata.opportunityScore) },
            { label: "Build readiness", value: fmt(artifact.metadata.buildReadiness) },
            { label: "Selection score", value: fmt(artifact.metadata.selectionScore) },
            { label: "Validation score", value: fmt(artifact.metadata.validationScore) },
            { label: "Monetization score", value: fmt(artifact.metadata.monetizationScore) },
            { label: "Fatal assumption risk", value: fmt(artifact.metadata.fatalAssumptionRisk) },
            { label: "Expected ROI", value: fmt(artifact.metadata.expectedRoi, "", "estimate") },
            { label: "Estimated capital required", value: fmt(artifact.metadata.capitalRequired, "", "estimate") },
            { label: "Infinity recommendation", value: fmt(artifact.metadata.infinityDecision) },
            { label: "Your decision", value: fmt(artifact.metadata.founderDecision) },
            {
              label: "Override",
              value:
                artifact.metadata.overrideFounder != null
                  ? "FOUNDER OVERRIDE"
                  : artifact.metadata.origin === "FOUNDER_OVERRIDE"
                    ? "FOUNDER OVERRIDE"
                    : "NONE",
            },
          ],
        },
        {
          id: "evidence",
          title: "Evidence",
          rows: [
            { label: "Research pipeline", value: fmt(artifact.metadata.researchPipeline) },
            { label: "Weakest assumption", value: fmt(artifact.metadata.weakestAssumption) },
            { label: "Founder claims grounded", value: "NO — founder-provided claims are not grounded evidence" },
          ],
        },
        {
          id: "system",
          title: "System View",
          rows: [
            { label: "Submission ID", value: artifact.sourceRecordId },
            { label: "Candidate ID", value: fmt(artifact.metadata.candidateId) },
            { label: "Submitted by", value: fmt(artifact.metadata.submittedBy) },
            { label: "Approved by", value: fmt(artifact.metadata.approvedBy) },
            { label: "Origin", value: fmt(artifact.metadata.origin) },
            { label: "Infinity decision", value: fmt(artifact.metadata.infinityDecision) },
            { label: "Founder decision", value: fmt(artifact.metadata.founderDecision) },
          ],
        },
      ];
      break;
    }
    default:
      summary = artifact.subtitle ?? artifact.title;
      sections = [
        {
          id: "details",
          title: "Details",
          rows: [
            { label: "Type", value: artifact.artifactType },
            { label: "State", value: artifact.state },
            { label: "Source", value: `${artifact.sourceRecordType}:${artifact.sourceRecordId}` },
          ],
        },
      ];
    }
  }

  const hotTakes = hotTakesOverride ?? deriveHotTakes({
    decision: decision ?? detail?.selection?.decision,
    fatalAssumptionRisk: detail?.selection?.fatalAssumptionRisk,
    expectedRoi: detail?.selection?.expectedRoi ?? detail?.monetization?.expectedRoi,
    ltvCacRatio: detail?.selection?.ltvCacRatio ?? detail?.monetization?.ltvCacRatio,
    monetizationScore: detail?.selection?.monetizationScore ?? detail?.monetization?.monetizationScore,
    selectionScore: detail?.selection?.selectionScore,
    fatalRiskBefore: artifact.metadata.fatalRiskBefore as number | null,
    fatalRiskAfter: artifact.metadata.fatalRiskAfter as number | null,
    blockingAssumptionCount: detail?.selection?.blockingAssumptions?.length,
    groundedResearchCount: detail?.research?.sourceCount,
    hasMarketPerformance: false,
  });

  return {
    artifact,
    summary,
    hotTakes,
    sections,
    journey: journeyOverride ?? buildJourney(candidateId, allArtifacts),
    relatedWork,
    decision,
    decisionWhy,
  };
}

export function flattenRoomArtifacts(
  roomArtifacts: Partial<Record<string, HqWorkArtifact[]>> | undefined,
  departments: Array<{ workArtifacts?: HqWorkArtifact[] }> | undefined,
): HqWorkArtifact[] {
  const fromRooms = Object.values(roomArtifacts ?? {}).flat();
  const fromDepts = (departments ?? []).flatMap((d) => d.workArtifacts ?? []);
  const byId = new Map<string, HqWorkArtifact>();
  for (const artifact of [...fromRooms, ...fromDepts]) {
    if (!artifact) continue;
    byId.set(artifact.id, artifact);
  }
  return [...byId.values()];
}

export { ROOM_LABELS };
