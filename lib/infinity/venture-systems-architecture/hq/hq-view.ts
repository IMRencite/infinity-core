import { BUILD_DEPENDENCY_ORDER, type SystemFamily } from "../constants";
import { resolveVentureSystems } from "../resolve";
import { providerCategoryForFamily } from "../selector";
import { VENTURE_SYSTEMS_WRITE_BOUNDARY } from "../write-boundary";
import type { ArchitectureCost, VentureSystemsBuildContract, VentureSystemsEvidence, VentureSystemRequirement } from "../types";
import {
  FAMILY_LABELS,
  FAMILY_PURPOSE,
  architectureStatusShort,
  businessModelDisplayLabel,
  humanizeCapability,
  monetizationDisplayLabel,
  procurementDisplayLabel,
  tenancyDisplayLabel,
  titleCaseToken,
  architectureDisplayLabel,
} from "./blueprint-explanations";
import {
  rejectHarnessArchitectureId,
  rejectHarnessArchitectureLabel,
} from "./identity-guards";

export type SystemsArchitectFamilyChip = {
  family: SystemFamily;
  label: string;
  required: boolean;
  status: "REQUIRED" | "DEFERRED" | "OPTIONAL";
  reason: string;
};

export type SystemsArchitectLane = {
  id: string;
  title: string;
  families: SystemsArchitectFamilyChip[];
};

export type SystemsArchitectProviderNote = {
  category: string;
  status: string;
  candidateLabels: string[];
  mandatoryVendor: null;
};

export type SystemsArchitectNodeStatus =
  | "REQUIRED"
  | "OPTIONAL"
  | "DEFERRED"
  | "BLOCKED"
  | "LIVE_GATED"
  | "NOT_SELECTED"
  | "AWAITING_BUSINESS_MODEL";

export type SystemsArchitectCapability = {
  code: string;
  label: string;
};

export type SystemsArchitectRelation = {
  id: string;
  label: string;
  kind: "DEPENDENCY" | "PRESENTATION_FLOW";
};

export type SystemsArchitectNode = {
  id: string;
  family: SystemFamily | null;
  label: string;
  purpose: string;
  whyNeeded: string;
  status: SystemsArchitectNodeStatus;
  statusLabel: string;
  required: boolean;
  awaitingEvidence: boolean;
  capabilities: SystemsArchitectCapability[];
  dependencies: SystemsArchitectRelation[];
  presentationPredecessors: SystemsArchitectRelation[];
  dependents: SystemsArchitectRelation[];
  clusterId: string;
  x: number;
  y: number;
  providerCategory: string | null;
  selectedProvider: null;
  selectedProviderLabel: "Not selected";
  providerCandidates: string[];
  tenancy: string | null;
  tenancyLabel: string;
  procurementStatus: string | null;
  procurementLabel: string;
  costDisplay: string;
  writeAuthorityLabel: "ARCHITECTURE ONLY";
  writeAuthorityDetail: "NOT AUTHORIZED";
  unresolved: Array<{ code: string; question: string }>;
  stageId: string;
};

export type SystemsArchitectStage = {
  id: string;
  title: string;
  kind: "KNOWN" | "AWAITING_BUSINESS_MODEL";
  nodes: SystemsArchitectNode[];
};

export type SystemsArchitectCompactStage = {
  id: string;
  title: string;
  indicator: "REQUIRED" | "DEFERRED" | "AWAITING" | "EMPTY";
  systemLabels: string[];
};

export type SystemsArchitectSpineIndicator = "REQUIRED" | "DEFERRED" | "AWAITING" | "BLOCKED" | "EMPTY";

export type SystemsArchitectSpinePoint = {
  id: string;
  title: string;
  indicator: SystemsArchitectSpineIndicator;
  branchIndicators: SystemsArchitectSpineIndicator[];
  systemLabels: string[];
};

export type SystemsArchitectEdge = {
  id: string;
  fromId: string;
  toId: string;
  kind: "DEPENDENCY" | "PRESENTATION";
};

export type SystemsArchitectCluster = {
  id: string;
  title: string;
  kind: "KNOWN" | "AWAITING_BUSINESS_MODEL";
  containsRequired: boolean;
  nodeIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SystemsArchitectCoverage = {
  state: "MODEL_REQUIRED" | "PARTIAL_ARCHITECTURE" | "ARCHITECTURE_MODELED";
  stateLabel: string;
  resolvedCount: number;
  resolvableCount: number;
  coverageLabel: string;
  percent: number | null;
};

export type SystemsArchitectEntityKind = "VENTURE" | "OPPORTUNITY_CANDIDATE" | "NONE";

export type SystemsArchitectIdentityBind = {
  entityKind?: SystemsArchitectEntityKind | null;
  entityId?: string | null;
  entityName?: string | null;
  entityOrigin?: string | null;
  entityStatusLabel?: string | null;
  ventureId?: string | null;
  ventureName?: string | null;
  ventureOrigin?: string | null;
  ventureStatus?: string | null;
  ventureStage?: string | null;
  monetizationModel?: string | null;
};

export type SystemsArchitectHqView = {
  businessModel: string;
  businessModelLabel: string;
  paymentArchitecture: string;
  paymentArchitectureLabel: string;
  requiredCount: number;
  deferredCount: number;
  optionalCount: number;
  previewPath: string[];
  tenancy: string;
  tenancyLabel: string;
  procurementSummary: string;
  estimatedRecurringCostDisplay: string;
  estimatedRecurringCostActuality: ArchitectureCost["actuality"];
  unresolvedGaps: Array<{ code: string; question: string }>;
  lanes: SystemsArchitectLane[];
  nodes: SystemsArchitectNode[];
  stages: SystemsArchitectStage[];
  compactStages: SystemsArchitectCompactStage[];
  clusters: SystemsArchitectCluster[];
  edges: SystemsArchitectEdge[];
  topologySpine: SystemsArchitectSpinePoint[];
  coverage: SystemsArchitectCoverage;
  architectureStateLabel: string;
  architectureStatusShort: string;
  architectureDisplayLabel: string;
  entityKind: SystemsArchitectEntityKind;
  entityId: string | null;
  entityName: string | null;
  entityOrigin: string | null;
  entityStatusLabel: string | null;
  hasArchitectureContext: boolean;
  ventureId: string | null;
  ventureName: string | null;
  ventureOrigin: string | null;
  ventureStatus: string | null;
  ventureStage: string | null;
  monetizationModel: string | null;
  monetizationLabel: string;
  knownSystemLabels: string[];
  unresolvedAreaLabels: string[];
  unresolvedReason: string | null;
  unresolvedWhy: string | null;
  defaultSelectedNodeId: string | null;
  evidenceInsufficient: boolean;
  evidenceMessage: string | null;
  providerReadinessLabel: string;
  liveWriteAuthorityLabel: "NO";
  providerNotes: SystemsArchitectProviderNote[];
  explanation: string;
  liveProvisioningAuthority: false;
  livePurchaseAuthority: false;
  modeledNotPurchased: true;
  writeReady: false;
  evidenceGrounded: boolean;
};

function readTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ventureNameSuffix(ventureName: string | null): string {
  return ventureName ? ` for ${ventureName}` : "";
}

export function identityFromPersistedHqRows(input: {
  entityKind?: SystemsArchitectEntityKind | null;
  entityId?: string | null;
  entityName?: string | null;
  entityOrigin?: string | null;
  entityStatusLabel?: string | null;
  ventureId?: string | null;
  ventureName?: string | null;
  ventureOrigin?: string | null;
  ventureStatus?: string | null;
  ventureStage?: string | null;
  monetizationPlan?: Record<string, unknown> | null;
  blueprint?: Record<string, unknown> | null;
}): SystemsArchitectIdentityBind {
  const plan = input.monetizationPlan ?? {};
  const blueprint = input.blueprint ?? {};
  const identity = blueprint.identity_package && typeof blueprint.identity_package === "object"
    ? (blueprint.identity_package as Record<string, unknown>)
    : null;
  const ventureName =
    rejectHarnessArchitectureLabel(input.ventureName) ??
    rejectHarnessArchitectureLabel(readTrimmed(blueprint.venture_name_working)) ??
    rejectHarnessArchitectureLabel(readTrimmed(blueprint.venture_name)) ??
    rejectHarnessArchitectureLabel(readTrimmed(identity?.displayName)) ??
    rejectHarnessArchitectureLabel(readTrimmed(identity?.workingName)) ??
    rejectHarnessArchitectureLabel(readTrimmed(plan.title));
  const entityKind = input.entityKind ?? (ventureName ? "VENTURE" : "NONE");
  const entityId =
    rejectHarnessArchitectureId(input.entityId) ??
    (entityKind === "NONE" ? null : rejectHarnessArchitectureId(input.ventureId));
  return {
    entityKind,
    entityId,
    entityName: rejectHarnessArchitectureLabel(input.entityName) ?? ventureName,
    entityOrigin: rejectHarnessArchitectureLabel(input.entityOrigin) ?? rejectHarnessArchitectureLabel(readTrimmed(input.ventureOrigin) ?? readTrimmed(identity?.origin) ?? readTrimmed(blueprint.origin)),
    entityStatusLabel: readTrimmed(input.entityStatusLabel),
    ventureId: entityKind === "NONE" ? null : (rejectHarnessArchitectureId(input.ventureId) ?? entityId),
    ventureName: entityKind === "NONE" ? null : ventureName,
    ventureOrigin: rejectHarnessArchitectureLabel(readTrimmed(input.ventureOrigin) ?? readTrimmed(identity?.origin) ?? readTrimmed(blueprint.origin)),
    ventureStatus: readTrimmed(input.ventureStatus),
    ventureStage: readTrimmed(input.ventureStage),
    monetizationModel:
      readTrimmed(plan.model_type) ??
      readTrimmed(blueprint.primary_monetization_model),
  };
}

export function bindSystemsArchitectVentureContext(
  view: SystemsArchitectHqView,
  identity: SystemsArchitectIdentityBind,
): SystemsArchitectHqView {
  const entityKind = identity.entityKind ?? view.entityKind ?? (rejectHarnessArchitectureLabel(identity.ventureName) ? "VENTURE" : view.entityKind);
  const entityName =
    entityKind === "NONE"
      ? null
      : rejectHarnessArchitectureLabel(identity.entityName) ??
        rejectHarnessArchitectureLabel(identity.ventureName) ??
        rejectHarnessArchitectureLabel(view.entityName) ??
        rejectHarnessArchitectureLabel(view.ventureName);
  const entityId =
    entityKind === "NONE"
      ? null
      : rejectHarnessArchitectureId(identity.entityId) ??
        rejectHarnessArchitectureId(identity.ventureId) ??
        rejectHarnessArchitectureId(view.entityId) ??
        rejectHarnessArchitectureId(view.ventureId);
  const ventureName = entityKind === "NONE" ? null : entityName;
  const suffix = ventureNameSuffix(ventureName);
  const evidenceMessage = view.evidenceInsufficient
    ? `Infinity does not yet have enough business-model evidence to derive the full operating stack${suffix}.`
    : view.evidenceMessage;
  const unresolvedWhy = view.evidenceInsufficient
    ? `Infinity cannot resolve Revenue, Customer, Communications, Operations, Growth, or Intelligence${suffix} until the business model is known.`
    : view.unresolvedWhy;
  return {
    ...view,
    entityKind,
    entityId,
    entityName,
    entityOrigin:
      rejectHarnessArchitectureLabel(identity.entityOrigin) ??
      rejectHarnessArchitectureLabel(identity.ventureOrigin) ??
      view.entityOrigin,
    entityStatusLabel: readTrimmed(identity.entityStatusLabel) ?? view.entityStatusLabel,
    hasArchitectureContext: entityKind !== "NONE" && Boolean(entityName || entityId),
    ventureId: entityKind === "NONE" ? null : entityId,
    ventureName,
    ventureOrigin:
      rejectHarnessArchitectureLabel(identity.entityOrigin) ??
      rejectHarnessArchitectureLabel(identity.ventureOrigin) ??
      view.ventureOrigin,
    ventureStatus: readTrimmed(identity.ventureStatus) ?? view.ventureStatus,
    ventureStage: readTrimmed(identity.ventureStage) ?? view.ventureStage,
    monetizationModel: readTrimmed(identity.monetizationModel) ?? view.monetizationModel,
    evidenceMessage,
    unresolvedWhy,
  };
}

export function selectSystemsArchitectNode(
  view: SystemsArchitectHqView,
  selectedId: string | null,
): SystemsArchitectNode | null {
  const concrete = view.nodes.filter((node) => Boolean(node.family));
  return (
    concrete.find((node) => node.id === selectedId) ??
    concrete.find((node) => node.id === view.defaultSelectedNodeId) ??
    null
  );
}

const LANE_FAMILIES: Array<{ id: string; title: string; families: SystemFamily[] }> = [
  { id: "identity", title: "Identity", families: ["IDENTITY_AND_ACCOUNTS", "AUTHORIZATION_AND_ROLES"] },
  { id: "payments", title: "Payments", families: ["PAYMENTS", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"] },
  { id: "crm", title: "CRM / Lead capture", families: ["LEAD_CAPTURE", "CRM"] },
  { id: "communications", title: "Communications", families: ["TRANSACTIONAL_EMAIL", "MARKETING_EMAIL", "SMS"] },
  { id: "operations", title: "Scheduling / Operations", families: ["SCHEDULING", "OPERATIONS", "HUMAN_OPERATIONS"] },
  { id: "support", title: "Support / Success", families: ["CUSTOMER_SUPPORT", "CUSTOMER_SUCCESS"] },
  { id: "analytics", title: "Analytics / Attribution", families: ["ANALYTICS", "ATTRIBUTION"] },
  {
    id: "trust",
    title: "Reputation / Compliance",
    families: ["REPUTATION_AND_REVIEWS", "LEGAL_AND_COMPLIANCE", "SECURITY_AND_RISK"],
  },
  {
    id: "growth",
    title: "Growth systems",
    families: [
      "CONTENT_AND_DISTRIBUTION",
      "SEO",
      "CUSTOMER_ACQUISITION",
      "SOCIAL_DISTRIBUTION",
      "LIFECYCLE_AUTOMATION",
      "EXPERIMENTATION",
      "AFFILIATE_AND_PARTNERS",
      "LOCALIZATION",
    ],
  },
];

const BLUEPRINT_STAGES: Array<{ id: string; title: string; families: SystemFamily[] }> = [
  { id: "payments", title: "Payments / Revenue", families: ["PAYMENTS", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"] },
  {
    id: "identity",
    title: "Identity / Lead capture",
    families: ["IDENTITY_AND_ACCOUNTS", "AUTHORIZATION_AND_ROLES", "LEAD_CAPTURE"],
  },
  { id: "crm", title: "CRM / Customer acquisition", families: ["CRM", "CUSTOMER_ACQUISITION"] },
  {
    id: "communications",
    title: "Communications / Scheduling",
    families: ["TRANSACTIONAL_EMAIL", "MARKETING_EMAIL", "SMS", "SCHEDULING"],
  },
  { id: "operations", title: "Operations / Delivery", families: ["OPERATIONS", "HUMAN_OPERATIONS", "LIFECYCLE_AUTOMATION"] },
  { id: "support", title: "Support / Customer success", families: ["CUSTOMER_SUPPORT", "CUSTOMER_SUCCESS"] },
  { id: "analytics", title: "Analytics / Attribution", families: ["ANALYTICS", "ATTRIBUTION"] },
  {
    id: "growth",
    title: "Reputation / Retention / Growth",
    families: [
      "REPUTATION_AND_REVIEWS",
      "SEO",
      "CONTENT_AND_DISTRIBUTION",
      "SOCIAL_DISTRIBUTION",
      "EXPERIMENTATION",
      "AFFILIATE_AND_PARTNERS",
      "LOCALIZATION",
    ],
  },
  { id: "compliance", title: "Compliance / Security", families: ["LEGAL_AND_COMPLIANCE", "SECURITY_AND_RISK"] },
];

const COMPACT_BUCKETS: Array<{ id: string; title: string; stageIds: string[] }> = [
  { id: "business", title: "Business", stageIds: [] },
  { id: "revenue", title: "Revenue", stageIds: ["payments"] },
  { id: "customers", title: "Customers", stageIds: ["identity", "crm", "communications"] },
  { id: "operations", title: "Operations", stageIds: ["operations", "support"] },
  { id: "growth", title: "Growth", stageIds: ["analytics", "growth", "compliance"] },
];

const ARCHITECTURE_CLUSTERS: Array<{ id: string; title: string; families: SystemFamily[]; x: number; y: number; w: number; h: number }> = [
  { id: "revenue", title: "Revenue", families: ["PAYMENTS", "ENTITLEMENTS"], x: 36, y: 3, w: 30, h: 24 },
  { id: "intelligence", title: "Intelligence", families: ["ANALYTICS", "ATTRIBUTION", "EXPERIMENTATION"], x: 68, y: 3, w: 30, h: 24 },
  {
    id: "customer",
    title: "Customer",
    families: ["LEAD_CAPTURE", "CRM", "CUSTOMER_ACQUISITION", "IDENTITY_AND_ACCOUNTS", "AUTHORIZATION_AND_ROLES"],
    x: 2,
    y: 29,
    w: 32,
    h: 28,
  },
  {
    id: "communications",
    title: "Communications",
    families: ["TRANSACTIONAL_EMAIL", "MARKETING_EMAIL", "SMS"],
    x: 36,
    y: 30,
    w: 30,
    h: 24,
  },
  {
    id: "operations",
    title: "Operations",
    families: ["SCHEDULING", "COMMERCE_AND_FULFILLMENT", "CUSTOMER_SUPPORT", "CUSTOMER_SUCCESS", "HUMAN_OPERATIONS", "OPERATIONS"],
    x: 68,
    y: 30,
    w: 30,
    h: 28,
  },
  {
    id: "growth",
    title: "Growth",
    families: ["SEO", "CONTENT_AND_DISTRIBUTION", "SOCIAL_DISTRIBUTION", "REPUTATION_AND_REVIEWS", "AFFILIATE_AND_PARTNERS", "LIFECYCLE_AUTOMATION"],
    x: 36,
    y: 57,
    w: 30,
    h: 22,
  },
  {
    id: "foundation",
    title: "Foundation",
    families: ["SECURITY_AND_RISK", "LEGAL_AND_COMPLIANCE", "LOCALIZATION"],
    x: 2,
    y: 60,
    w: 32,
    h: 20,
  },
];

const UNRESOLVED_AREA_ORDER = ["revenue", "customer", "communications", "operations", "growth", "intelligence"];

function prioritizeKnownArchitectureLayout(
  clusters: SystemsArchitectCluster[],
  nodes: SystemsArchitectNode[],
  evidenceInsufficient: boolean,
): { clusters: SystemsArchitectCluster[]; nodes: SystemsArchitectNode[] } {
  if (!evidenceInsufficient) return { clusters, nodes };
  const known = clusters.filter((cluster) => cluster.kind === "KNOWN");
  const awaiting = clusters.filter((cluster) => cluster.kind !== "KNOWN");
  const nextNodes = nodes.map((node) => ({ ...node }));
  const nextClusters: SystemsArchitectCluster[] = known.map((cluster, index) => {
    const x = 3;
    const y = 4 + index * 40;
    const width = 50;
    const height = 36;
    const scaleX = cluster.width > 0 ? width / cluster.width : 1;
    const scaleY = cluster.height > 0 ? height / cluster.height : 1;
    for (const node of nextNodes) {
      if (node.clusterId !== cluster.id) continue;
      node.x = x + (node.x - cluster.x) * scaleX;
      node.y = y + (node.y - cluster.y) * scaleY;
    }
    return { ...cluster, x, y, width, height };
  });
  awaiting.forEach((cluster, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    nextClusters.push({
      ...cluster,
      x: 56 + col * 21.5,
      y: 4 + row * 15.5,
      width: 20.5,
      height: 14,
    });
  });
  return { clusters: nextClusters, nodes: nextNodes };
}

const SPINE_CLUSTER_IDS: Array<{ id: string; title: string; clusterIds: string[] }> = [
  { id: "model", title: "Model", clusterIds: [] },
  { id: "revenue", title: "Revenue", clusterIds: ["revenue"] },
  { id: "customer", title: "Customer", clusterIds: ["customer", "communications"] },
  { id: "operations", title: "Operations", clusterIds: ["operations"] },
  { id: "intelligence", title: "Intelligence", clusterIds: ["intelligence", "growth", "foundation"] },
];

function costDisplay(cost: ArchitectureCost): string {
  if (cost.actuality === "UNKNOWN" || cost.value == null) return "UNKNOWN";
  return `$${cost.value.toFixed(0)}/mo ${cost.actuality}`;
}

function inspectorCostDisplay(cost: ArchitectureCost | null): string {
  if (!cost || cost.actuality === "UNKNOWN" || cost.value == null) return "Unknown";
  if (cost.value === 0 && cost.actuality !== "ACTUAL") return "Unknown";
  return `$${cost.value.toFixed(0)}/mo ${cost.actuality}`;
}

function chipStatus(required: boolean, priority: string): SystemsArchitectFamilyChip["status"] {
  if (required) return "REQUIRED";
  if (priority === "OPTIONAL") return "OPTIONAL";
  return "DEFERRED";
}

function nodeStatus(requirement: VentureSystemRequirement, procurementStatus: string | null): SystemsArchitectNodeStatus {
  if (requirement.unresolvedPolicies.length > 0 && requirement.required) return "BLOCKED";
  if (procurementStatus === "LIVE_PURCHASE_GATED" || procurementStatus === "LIVE_ACTIVE") return "LIVE_GATED";
  if (requirement.required) return "REQUIRED";
  if (requirement.priority === "OPTIONAL") return "OPTIONAL";
  if (!requirement.providerNeeded) return "DEFERRED";
  return "NOT_SELECTED";
}

function statusLabel(status: SystemsArchitectNodeStatus): string {
  const labels: Record<SystemsArchitectNodeStatus, string> = {
    REQUIRED: "Required",
    OPTIONAL: "Optional",
    DEFERRED: "Deferred",
    BLOCKED: "Blocked",
    LIVE_GATED: "Live gated",
    NOT_SELECTED: "Not selected",
    AWAITING_BUSINESS_MODEL: "Awaiting business model",
  };
  return labels[status];
}

export function evidenceFromHqSignals(input: {
  ventureId?: string | null;
  ventureType?: string | null;
  businessConcept?: string | null;
  monetizationModelType?: string | null;
  pricingModel?: string | null;
  hasDistinctBuyers?: boolean | null;
  hasDistinctSellers?: boolean | null;
}): VentureSystemsEvidence {
  return {
    ventureId: input.ventureId ?? null,
    ventureType: input.ventureType ?? null,
    businessConcept: input.businessConcept ?? null,
    monetizationModelType: input.monetizationModelType ?? null,
    hasDistinctBuyers: input.hasDistinctBuyers ?? null,
    hasDistinctSellers: input.hasDistinctSellers ?? null,
    seoIsPrimaryAcquisition: /seo|content|local/.test(`${input.ventureType ?? ""} ${input.businessConcept ?? ""}`.toLowerCase())
      ? true
      : null,
  };
}

export function evidenceFromPersistedHqRows(input: {
  ventureId?: string | null;
  ventureType?: string | null;
  monetizationPlan?: Record<string, unknown> | null;
  blueprint?: Record<string, unknown> | null;
}): VentureSystemsEvidence {
  const plan = input.monetizationPlan ?? {};
  const blueprint = input.blueprint ?? {};
  const modelType =
    (typeof plan.model_type === "string" ? plan.model_type : null) ??
    (typeof blueprint.primary_monetization_model === "string" ? blueprint.primary_monetization_model : null) ??
    (typeof blueprint.venture_type === "string" ? blueprint.venture_type : null);
  const concept =
    (typeof blueprint.business_summary === "string" ? blueprint.business_summary : null) ??
    (typeof blueprint.venture_name_working === "string" ? blueprint.venture_name_working : null);
  const ventureType =
    (typeof blueprint.venture_type === "string" ? blueprint.venture_type : null) ?? input.ventureType ?? null;
  const marketplace = /marketplace/.test(`${ventureType ?? ""} ${modelType ?? ""} ${concept ?? ""}`.toLowerCase());
  return evidenceFromHqSignals({
    ventureId: input.ventureId,
    ventureType,
    businessConcept: concept,
    monetizationModelType: modelType,
    pricingModel: typeof plan.pricing_model === "string" ? plan.pricing_model : null,
    hasDistinctBuyers: marketplace ? true : null,
    hasDistinctSellers: marketplace ? true : null,
  });
}

function familyRank(family: SystemFamily): number {
  const index = BUILD_DEPENDENCY_ORDER.indexOf(family);
  return index === -1 ? 999 : index;
}

export function selectDefaultSystemsArchitectNodeId(nodes: SystemsArchitectNode[]): string | null {
  const required = nodes
    .filter((node) => node.required && node.family)
    .sort((a, b) => familyRank(a.family!) - familyRank(b.family!));
  return required[0]?.id ?? nodes.find((node) => node.family)?.id ?? nodes[0]?.id ?? null;
}

function buildRequirementNode(
  requirement: VentureSystemRequirement,
  stageId: string,
  clusterId: string,
  x: number,
  y: number,
  contract: VentureSystemsBuildContract,
  labelByFamily: Map<SystemFamily, string>,
): SystemsArchitectNode {
  const category = providerCategoryForFamily(requirement.family);
  const procurement = category
    ? contract.vendorProcurementRequirements.find((item) => item.providerCategory === category) ?? null
    : null;
  const procurementStatus = requirement.providerNeeded ? (procurement?.procurementStatus ?? null) : "NOT_REQUIRED";
  const status = nodeStatus(requirement, procurementStatus);
  const declaredDependencies = requirement.dependencies.filter((family) => family !== requirement.family);
  const policyByCode = new Map(contract.unresolvedPolicies.map((item) => [item.code, item.question]));
  const unresolved = requirement.unresolvedPolicies.map((code) => ({
    code,
    question: policyByCode.get(code) ?? titleCaseToken(code.replace(/_/g, " ")),
  }));
  return {
    id: requirement.family,
    family: requirement.family,
    label: FAMILY_LABELS[requirement.family],
    purpose: FAMILY_PURPOSE[requirement.family],
    whyNeeded: requirement.reason,
    status,
    statusLabel: statusLabel(status),
    required: requirement.required,
    awaitingEvidence: false,
    capabilities: requirement.requiredCapabilities.map((code) => ({ code, label: humanizeCapability(code) })),
    dependencies: declaredDependencies.map((family) => ({
      id: family,
      label: labelByFamily.get(family) ?? FAMILY_LABELS[family],
      kind: "DEPENDENCY",
    })),
    presentationPredecessors: [],
    dependents: [],
    clusterId,
    x,
    y,
    providerCategory: category,
    selectedProvider: null,
    selectedProviderLabel: "Not selected",
    providerCandidates: procurement?.alternatives ?? [],
    tenancy: requirement.tenancyRequirement,
    tenancyLabel: tenancyDisplayLabel(requirement.tenancyRequirement),
    procurementStatus,
    procurementLabel: procurementDisplayLabel(procurementStatus),
    costDisplay: inspectorCostDisplay(requirement.providerNeeded ? (procurement?.monthlyCost ?? null) : null),
    writeAuthorityLabel: "ARCHITECTURE ONLY",
    writeAuthorityDetail: "NOT AUTHORIZED",
    unresolved,
    stageId,
  };
}

function clusterIndicator(nodes: SystemsArchitectNode[]): SystemsArchitectSpineIndicator {
  if (nodes.some((node) => node.status === "BLOCKED")) return "BLOCKED";
  if (nodes.some((node) => node.required)) return "REQUIRED";
  if (nodes.some((node) => node.awaitingEvidence)) return "AWAITING";
  if (nodes.some((node) => node.status === "DEFERRED")) return "DEFERRED";
  return "EMPTY";
}

function buildCoverage(
  nodes: SystemsArchitectNode[],
  clusters: SystemsArchitectCluster[],
  policyGapCount: number,
  evidenceInsufficient: boolean,
): SystemsArchitectCoverage {
  const resolvedCount = nodes.filter((node) => !node.awaitingEvidence).length;
  const awaitingCount = clusters.filter((cluster) => cluster.kind === "AWAITING_BUSINESS_MODEL").length;
  const resolvableCount = resolvedCount + awaitingCount + policyGapCount;
  const percent = resolvableCount > 0 ? Math.round((resolvedCount / resolvableCount) * 100) : null;
  const state = evidenceInsufficient
    ? "MODEL_REQUIRED"
    : awaitingCount + policyGapCount > 0
      ? "PARTIAL_ARCHITECTURE"
      : "ARCHITECTURE_MODELED";
  const stateLabel =
    state === "MODEL_REQUIRED" ? "MODEL REQUIRED" : state === "PARTIAL_ARCHITECTURE" ? "PARTIAL ARCHITECTURE" : "ARCHITECTURE MODELED";
  return {
    state,
    stateLabel,
    resolvedCount,
    resolvableCount,
    coverageLabel: resolvableCount > 0 ? `${resolvedCount} / ${resolvableCount} resolved` : stateLabel,
    percent,
  };
}

export function buildSystemsArchitectHqView(
  contract: VentureSystemsBuildContract,
  options: {
    evidenceGrounded?: boolean;
    explanation?: string;
    identity?: SystemsArchitectIdentityBind;
    monetizationModelType?: string | null;
  } = {},
): SystemsArchitectHqView {
  const required = contract.systemRequirements.filter((item) => item.required);
  const deferred = contract.systemRequirements.filter((item) => !item.required && item.priority !== "OPTIONAL");
  const optional = contract.systemRequirements.filter((item) => !item.required && item.priority === "OPTIONAL");
  const byFamily = new Map(contract.systemRequirements.map((item) => [item.family, item]));
  const labelByFamily = new Map(contract.systemRequirements.map((item) => [item.family, FAMILY_LABELS[item.family]]));
  const evidenceInsufficient = contract.businessModel === "AMBIGUOUS";
  const lanes: SystemsArchitectLane[] = [
    {
      id: "business",
      title: "Business model",
      families: [],
    },
    ...LANE_FAMILIES.map((lane) => ({
      id: lane.id,
      title: lane.title,
      families: lane.families
        .map((family) => {
          const requirement = byFamily.get(family);
          if (!requirement) return null;
          return {
            family,
            label: FAMILY_LABELS[family],
            required: requirement.required,
            status: chipStatus(requirement.required, requirement.priority),
            reason: requirement.reason,
          } satisfies SystemsArchitectFamilyChip;
        })
        .filter((item): item is SystemsArchitectFamilyChip => item != null),
    })),
  ].filter((lane) => lane.id === "business" || lane.families.length > 0);

  const stages = BLUEPRINT_STAGES.map((stage): SystemsArchitectStage | null => {
    const known = stage.families
      .map((family) => byFamily.get(family))
      .filter((item): item is VentureSystemRequirement => item != null)
      .sort((a, b) => familyRank(a.family) - familyRank(b.family));
    if (known.length > 0) {
      return {
        id: stage.id,
        title: stage.title,
        kind: "KNOWN",
        nodes: known.map((requirement, index) =>
          buildRequirementNode(requirement, stage.id, stage.id, 10 + index * 8, 10, contract, labelByFamily),
        ),
      };
    }
    if (evidenceInsufficient) {
      return {
        id: stage.id,
        title: stage.title,
        kind: "AWAITING_BUSINESS_MODEL",
        nodes: [] as SystemsArchitectNode[],
      };
    }
    return null;
  }).filter((stage): stage is SystemsArchitectStage => stage != null);

  const builtClusters: SystemsArchitectCluster[] = [];
  const canvasNodes: SystemsArchitectNode[] = [];
  for (const def of ARCHITECTURE_CLUSTERS) {
    const known = def.families
      .map((family) => byFamily.get(family))
      .filter((item): item is VentureSystemRequirement => item != null)
      .sort((a, b) => familyRank(a.family) - familyRank(b.family));
    if (known.length > 0) {
      const placed = known.map((requirement, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = def.x + 8 + col * Math.max(12, def.w / 2 - 3);
        const y = def.y + 13 + row * 6.2;
        return buildRequirementNode(requirement, def.id, def.id, x, y, contract, labelByFamily);
      });
      canvasNodes.push(...placed);
      builtClusters.push({
        id: def.id,
        title: def.title,
        kind: "KNOWN",
        containsRequired: placed.some((node) => node.required),
        nodeIds: placed.map((node) => node.id),
        x: def.x,
        y: def.y,
        width: def.w,
        height: def.h,
      });
      continue;
    }
    if (evidenceInsufficient) {
      builtClusters.push({
        id: def.id,
        title: def.title,
        kind: "AWAITING_BUSINESS_MODEL",
        containsRequired: false,
        nodeIds: [],
        x: def.x,
        y: def.y,
        width: def.w,
        height: def.h,
      });
    }
  }

  const presented = prioritizeKnownArchitectureLayout(builtClusters, canvasNodes, evidenceInsufficient);
  const layoutClusters = presented.clusters;
  const layoutNodes = presented.nodes;

  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  for (const node of layoutNodes) {
    node.dependents = [];
  }
  const edges: SystemsArchitectEdge[] = [];
  for (const node of layoutNodes) {
    for (const relation of node.dependencies) {
      const source = nodeById.get(relation.id);
      if (!source) continue;
      source.dependents.push({ id: node.id, label: node.label, kind: "DEPENDENCY" });
      edges.push({
        id: `dep:${source.id}->${node.id}`,
        fromId: source.id,
        toId: node.id,
        kind: "DEPENDENCY",
      });
    }
  }
  for (const cluster of layoutClusters) {
    const members = cluster.nodeIds
      .map((id) => nodeById.get(id))
      .filter((node): node is SystemsArchitectNode => Boolean(node && !node.awaitingEvidence));
    for (let index = 1; index < members.length; index += 1) {
      const from = members[index - 1]!;
      const to = members[index]!;
      from.presentationPredecessors = from.presentationPredecessors;
      to.presentationPredecessors = [
        ...to.presentationPredecessors,
        { id: from.id, label: from.label, kind: "PRESENTATION_FLOW" },
      ];
      edges.push({
        id: `pres:${from.id}->${to.id}`,
        fromId: from.id,
        toId: to.id,
        kind: "PRESENTATION",
      });
    }
  }

  const knownStageIds = stages.filter((stage) => stage.kind === "KNOWN").map((stage) => stage.id);
  for (const node of stages.flatMap((stage) => stage.nodes)) {
    const stageIndex = knownStageIds.indexOf(node.stageId);
    if (stageIndex <= 0) continue;
    const previous = stages.find((stage) => stage.id === knownStageIds[stageIndex - 1]);
    if (!previous) continue;
    node.presentationPredecessors = previous.nodes
      .filter((item) => !item.awaitingEvidence)
      .map((item) => ({
        id: item.id,
        label: item.label,
        kind: "PRESENTATION_FLOW" as const,
      }));
  }

  const compactStages: SystemsArchitectCompactStage[] = COMPACT_BUCKETS.map((bucket) => {
    if (bucket.id === "business") {
      return {
        id: bucket.id,
        title: bucket.title,
        indicator: evidenceInsufficient ? "AWAITING" : "REQUIRED",
        systemLabels: [businessModelDisplayLabel(contract.businessModel)],
      };
    }
    const bucketStages = stages.filter((stage) => bucket.stageIds.includes(stage.id));
    const bucketNodes = bucketStages.flatMap((stage) => stage.nodes);
    const requiredLabels = bucketNodes.filter((node) => node.required && node.family).map((node) => node.label);
    const awaiting = bucketStages.some((stage) => stage.kind === "AWAITING_BUSINESS_MODEL") && requiredLabels.length === 0;
    const deferredOnly = bucketNodes.some((node) => node.status === "DEFERRED") && requiredLabels.length === 0;
    return {
      id: bucket.id,
      title: bucket.title,
      indicator: requiredLabels.length > 0 ? "REQUIRED" : awaiting ? "AWAITING" : deferredOnly ? "DEFERRED" : "EMPTY",
      systemLabels: requiredLabels.slice(0, 2),
    };
  });

  const topologySpine: SystemsArchitectSpinePoint[] = SPINE_CLUSTER_IDS.map((point) => {
    if (point.id === "model") {
      return {
        id: point.id,
        title: point.title,
        indicator: evidenceInsufficient ? "AWAITING" : "REQUIRED",
        branchIndicators: [evidenceInsufficient ? "AWAITING" : "REQUIRED"],
        systemLabels: [],
      };
    }
    const related = layoutClusters.filter((cluster) => point.clusterIds.includes(cluster.id));
    const relatedNodes = related.flatMap((cluster) =>
      cluster.nodeIds.map((id) => nodeById.get(id)).filter((node): node is SystemsArchitectNode => node != null && Boolean(node.family)),
    );
    const awaitingOnly = related.some((cluster) => cluster.kind === "AWAITING_BUSINESS_MODEL") && relatedNodes.every((node) => !node.required);
    const indicator = awaitingOnly ? "AWAITING" : clusterIndicator(relatedNodes);
    const systemLabels = relatedNodes.filter((node) => node.required).map((node) => node.label).slice(0, 2);
    return {
      id: point.id,
      title: point.title,
      indicator,
      branchIndicators: awaitingOnly
        ? ["AWAITING"]
        : relatedNodes.slice(0, 3).map((node) =>
            node.status === "BLOCKED" ? "BLOCKED" : node.required ? "REQUIRED" : "DEFERRED",
          ),
      systemLabels,
    };
  });

  const coverage = buildCoverage(layoutNodes, layoutClusters, contract.unresolvedPolicies.length, evidenceInsufficient);
  const identity = options.identity ?? {};
  const entityKind =
    identity.entityKind ??
    (rejectHarnessArchitectureLabel(identity.entityName) || rejectHarnessArchitectureLabel(identity.ventureName)
      ? "VENTURE"
      : "NONE");
  const entityName =
    entityKind === "NONE"
      ? null
      : rejectHarnessArchitectureLabel(identity.entityName) ?? rejectHarnessArchitectureLabel(identity.ventureName);
  const entityId =
    entityKind === "NONE"
      ? null
      : rejectHarnessArchitectureId(identity.entityId) ?? rejectHarnessArchitectureId(identity.ventureId);
  const ventureName = entityKind === "NONE" ? null : entityName;
  const monetizationModel = readTrimmed(identity.monetizationModel) ?? readTrimmed(options.monetizationModelType);
  const hasEntitlements = required.some((item) => item.family === "ENTITLEMENTS");
  const monetizationLabel = monetizationDisplayLabel({
    businessModel: contract.businessModel,
    paymentArchitecture: contract.paymentArchitecture.architecture,
    monetizationModelType: monetizationModel,
    hasEntitlements,
    evidenceInsufficient,
  });
  const architectureShort = architectureStatusShort(coverage.state);
  const architectureLabel = architectureDisplayLabel(coverage.state, evidenceInsufficient);
  const businessModelLabel = businessModelDisplayLabel(contract.businessModel);
  const knownSystemLabels = layoutNodes
    .filter((node) => node.family && node.required)
    .sort((a, b) => familyRank(a.family!) - familyRank(b.family!))
    .map((node) => node.label);
  const unresolvedAreaLabels = UNRESOLVED_AREA_ORDER.map(
    (id) => layoutClusters.find((cluster) => cluster.id === id && cluster.kind === "AWAITING_BUSINESS_MODEL")?.title ?? null,
  ).filter((title): title is string => title != null);
  const unresolvedReason = evidenceInsufficient ? "Awaiting business-model resolution" : null;
  const suffix = ventureNameSuffix(ventureName);
  const unresolvedWhy = evidenceInsufficient
    ? `Infinity cannot resolve Revenue, Customer, Communications, Operations, Growth, or Intelligence${suffix} until the business model is known.`
    : contract.unresolvedPolicies[0]?.question ?? null;

  const previewPath = [
    businessModelLabel,
    evidenceInsufficient ? "Not yet resolved" : titleCaseToken(contract.paymentArchitecture.architecture.replace(/_/g, " ")),
    ...required.slice(0, 4).map((item) => FAMILY_LABELS[item.family]),
  ];

  const paid = contract.vendorProcurementRequirements.filter((item) => item.procurementStatus !== "NOT_REQUIRED");
  const deferredProc = paid.filter((item) => item.procurementStatus === "DEFERRED" || item.procurementStatus === "FREE_TIER").length;
  const gated = paid.filter((item) => item.procurementStatus === "LIVE_PURCHASE_GATED" || item.procurementStatus === "BUDGET_REVIEW_REQUIRED").length;
  const cost = contract.vendorProcurementRequirements.map((item) => item.monthlyCost);
  const unknown = cost.some((item) => item.actuality === "UNKNOWN" || item.value == null);
  const knownSum = unknown ? null : cost.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return {
    businessModel: contract.businessModel,
    businessModelLabel,
    paymentArchitecture: contract.paymentArchitecture.architecture,
    paymentArchitectureLabel: titleCaseToken(contract.paymentArchitecture.architecture.replace(/_/g, " ")),
    requiredCount: required.length,
    deferredCount: deferred.length,
    optionalCount: optional.length,
    previewPath,
    tenancy: contract.providerTenancy,
    tenancyLabel: titleCaseToken(contract.providerTenancy.replace(/_/g, " ")),
    procurementSummary:
      paid.length === 0
        ? "No paid providers required yet"
        : `${deferredProc} deferred or free-tier · ${gated} gated · none purchased`,
    estimatedRecurringCostDisplay: unknown || knownSum == null ? "UNKNOWN" : `$${knownSum.toFixed(0)}/mo ESTIMATE`,
    estimatedRecurringCostActuality: unknown || knownSum == null ? "UNKNOWN" : "ESTIMATE",
    unresolvedGaps: contract.unresolvedPolicies.map((item) => ({ code: item.code, question: item.question })),
    lanes,
    nodes: layoutNodes,
    stages,
    compactStages,
    clusters: layoutClusters,
    edges,
    topologySpine,
    coverage,
    architectureStateLabel: coverage.stateLabel,
    architectureStatusShort: architectureShort,
    architectureDisplayLabel: architectureLabel,
    entityKind,
    entityId,
    entityName,
    entityOrigin: rejectHarnessArchitectureLabel(identity.entityOrigin) ?? rejectHarnessArchitectureLabel(identity.ventureOrigin),
    entityStatusLabel: readTrimmed(identity.entityStatusLabel) ?? readTrimmed(identity.ventureStatus),
    hasArchitectureContext: entityKind !== "NONE" && Boolean(entityName || entityId),
    ventureId: entityKind === "NONE" ? null : entityId,
    ventureName,
    ventureOrigin: rejectHarnessArchitectureLabel(identity.entityOrigin) ?? rejectHarnessArchitectureLabel(identity.ventureOrigin),
    ventureStatus: readTrimmed(identity.ventureStatus),
    ventureStage: readTrimmed(identity.ventureStage),
    monetizationModel,
    monetizationLabel,
    knownSystemLabels,
    unresolvedAreaLabels,
    unresolvedReason,
    unresolvedWhy,
    defaultSelectedNodeId: selectDefaultSystemsArchitectNodeId(layoutNodes),
    evidenceInsufficient,
    evidenceMessage: evidenceInsufficient
      ? `Infinity does not yet have enough business-model evidence to derive the full operating stack${suffix}.`
      : null,
    providerReadinessLabel: paid.length === 0 ? "No paid providers required" : "Modeled · not purchased",
    liveWriteAuthorityLabel: "NO",
    providerNotes: contract.vendorProcurementRequirements
      .filter((item) => item.procurementStatus !== "NOT_REQUIRED")
      .map((item) => ({
        category: item.providerCategory,
        status: item.procurementStatus,
        candidateLabels: item.alternatives,
        mandatoryVendor: null,
      })),
    explanation:
      options.explanation ??
      (evidenceInsufficient
        ? "Infinity cannot derive the full operating stack until the business model is known."
        : `Infinity selected a ${businessModelLabel} operating blueprint.`),
    liveProvisioningAuthority: false,
    livePurchaseAuthority: false,
    modeledNotPurchased: true,
    writeReady: false,
    evidenceGrounded: options.evidenceGrounded ?? true,
  };
}

export function resolveSystemsArchitectHqView(
  evidence: VentureSystemsEvidence,
  identity: SystemsArchitectIdentityBind = {},
): SystemsArchitectHqView {
  const resolved = resolveVentureSystems(evidence);
  const grounded = Boolean(
    evidence.operatingModel ||
      evidence.ventureType ||
      evidence.monetizationModelType ||
      evidence.businessConcept ||
      evidence.paymentEvidence ||
      evidence.paymentContract,
  );
  return buildSystemsArchitectHqView(resolved.contract, {
    evidenceGrounded: grounded,
    explanation: resolved.explanation,
    identity,
    monetizationModelType: evidence.monetizationModelType ?? null,
  });
}

export function systemsArchitectWriteBoundary() {
  return VENTURE_SYSTEMS_WRITE_BOUNDARY;
}

export function formatArchitectureCost(cost: ArchitectureCost): string {
  return costDisplay(cost);
}
