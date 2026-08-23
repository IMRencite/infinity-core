import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_HQ_ROOM_IDS, LIFECYCLE_ROOM_SEQUENCE, getRoomDisplayNames } from "../room-naming";
import { DEPARTMENTS, getDepartmentForEngine } from "../department-registry";
import { buildDepartments } from "../build-snapshot";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import { VENTURE_SYSTEMS_WRITE_BOUNDARY } from "@/lib/infinity/venture-systems-architecture";
import { ART_MARKETPLACE_FIXTURE } from "@/lib/infinity/payment-architecture";
import {
  resolveSystemsArchitectHqView,
  evidenceFromHqSignals,
  selectDefaultSystemsArchitectNodeId,
} from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import type { RawEngineData } from "../load-raw-data";
import type { OperatorVentureSnapshot } from "../types";

const COMPONENTS = join(process.cwd(), "components/dashboard/operator-console");
const CSS = join(process.cwd(), "app/globals.css");

function emptyRaw(): RawEngineData {
  return {
    opportunity: null,
    opportunityCandidates: [],
    researchRuns: [],
    aiBrainRuns: [],
    monetizationRuns: [],
    monetizationPlans: [],
    ventureSelectionRuns: [],
    companyBuilderRuns: [],
    companyBuilderBlueprints: [],
    organicGrowthRuns: [],
    organicGrowthPackages: [],
    creativeMediaRuns: [],
    creativeMediaPackages: [],
    creativeMediaJobs: [],
    creativeMediaAssets: [],
    creativeMediaReviews: [],
    pabRuns: [],
    pabTasks: [],
    pabProviderCalls: [],
    pabChangeSets: [],
    pabProductionArtifacts: [],
    productionArtifacts: [],
    externalActions: [],
    launchPlans: [],
    performanceRuns: [],
    performancePackages: [],
    performanceDecisions: [],
    performanceAggregates: [],
    missions: [],
  };
}

describe("Systems Architect HQ Room V1", () => {
  it("appears on the HQ floor after Blueprint Lab", () => {
    expect(LIFECYCLE_ROOM_SEQUENCE).toContain("systems_architect");
    expect(LIFECYCLE_ROOM_SEQUENCE.indexOf("systems_architect")).toBe(
      LIFECYCLE_ROOM_SEQUENCE.indexOf("company_operations") + 1,
    );
    expect(ALL_HQ_ROOM_IDS).toContain("systems_architect");
    expect(getRoomDisplayNames("systems_architect").displayName).toBe("Systems Architect");
    expect(DEPARTMENTS.some((dept) => dept.id === "systems_architect")).toBe(true);
    expect(getDepartmentForEngine("venture_systems_architecture")).toBe("systems_architect");
    expect(readFileSync(join(COMPONENTS, "hq-spatial-floor.tsx"), "utf8")).toContain("LIFECYCLE_ROOM_SEQUENCE");
  });

  it("renders a visual operating blueprint from canonical architecture", () => {
    const view = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "marketplace",
        monetizationModelType: "two_sided_marketplace",
        businessConcept: "Art marketplace connecting collectors and artists",
      }),
    );
    expect(view.businessModel).toBe("MARKETPLACE");
    expect(view.paymentArchitecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(view.lanes.some((lane) => lane.id === "payments")).toBe(true);
    expect(view.lanes.some((lane) => lane.id === "crm" || lane.families.some((item) => item.family === "CRM"))).toBe(false);
    expect(view.tenancy).toBeTruthy();
    expect(view.unresolvedGaps.length).toBeGreaterThan(0);
    expect(view.writeReady).toBe(false);
    expect(view.livePurchaseAuthority).toBe(false);
    expect(view.nodes.some((node) => node.family === "PAYMENTS" && node.required)).toBe(true);
    expect(view.nodes.some((node) => node.family === "CRM" && node.required)).toBe(false);
    expect(view.nodes.find((node) => node.id === view.defaultSelectedNodeId)?.required).toBe(true);
    expect(readFileSync(join(COMPONENTS, "department-room.tsx"), "utf8")).toContain("SystemsArchitectBlueprint");
    expect(readFileSync(join(COMPONENTS, "department-detail-panel.tsx"), "utf8")).toContain("SystemsArchitectDetail");
    expect(readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8")).toContain("Operating architecture");
  });

  it("reuses payment architecture and stays provider-neutral", () => {
    const view = resolveSystemsArchitectHqView({
      paymentEvidence: ART_MARKETPLACE_FIXTURE,
      hasDistinctBuyers: true,
      hasDistinctSellers: true,
    });
    expect(view.paymentArchitecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(view.providerNotes.every((note) => note.mandatoryVendor === null)).toBe(true);
    const source = [
      readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "lib/infinity/venture-systems-architecture/hq/hq-view.ts"), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(/HubSpot is required|must use Twilio|must use Resend|must use GA4/i);
  });

  it("keeps deferred and unknown states truthful", () => {
    const view = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "digital_product",
        monetizationModelType: "digital_products",
        businessConcept: "One-time downloadable digital product",
      }),
    );
    expect(view.lanes.flatMap((lane) => lane.families).some((item) => item.family === "CRM" && item.required)).toBe(false);
    expect(view.estimatedRecurringCostDisplay === "UNKNOWN" || !view.estimatedRecurringCostDisplay.startsWith("$0")).toBe(true);
    if (view.estimatedRecurringCostActuality === "UNKNOWN") {
      expect(view.estimatedRecurringCostDisplay).toBe("UNKNOWN");
    }
    expect(view.modeledNotPurchased).toBe(true);
    expect(view.writeReady).toBe(false);
  });

  it("derives the room from HQ snapshot data without mutations", () => {
    const raw = emptyRaw();
    raw.monetizationPlans = [{ id: "plan-1", model_type: "saas_subscription", pricing_model: "monthly", created_at: "2026-08-21T00:00:00Z" }];
    const departments = buildDepartments(raw, null, {
      ventureAssemblyId: "vent-1",
      organizationId: "org",
      missionId: "m1",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "AI SEO Website Platform",
      ventureType: "saas",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: "experimental",
      origin: "FOUNDER_SUBMITTED",
      correlationIds: [],
    });
    const room = departments.find((dept) => dept.id === "systems_architect");
    expect(room).toBeTruthy();
    expect(room?.state).toBe("COMPLETE");
    const view = room?.detail.systemsArchitectView as {
      paymentArchitecture?: string;
      ventureName?: string | null;
      businessModel?: string;
      monetizationLabel?: string;
      architectureStatusShort?: string;
    };
    expect(view?.paymentArchitecture).toMatch(/SUBSCRIPTION|BILLING/);
    expect(view?.ventureName).toBe("AI SEO Website Platform");
    expect(view?.businessModel).toBe("SAAS");
    expect(view?.monetizationLabel.toLowerCase()).toMatch(/subscription/);
    expect(view?.architectureStatusShort).toBeTruthy();
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.crmWrites).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.paidSubscriptions).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.eagActions).toBe(0);
  });

  it("keeps the visual rail wrapping instead of clipping or overflowing", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain(".hq-systems-rail");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain(".hq-systems-blueprint");
    expect(css).not.toMatch(/\.hq-systems-rail\s*\{[^}]*overflow-x:\s*scroll/);
    expect(css).not.toMatch(/\.hq-systems-title\s*\{[^}]*white-space:\s*nowrap/);
    const room = readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8");
    expect(room).not.toMatch(/truncate|whitespace-nowrap|line-clamp/);
  });

  it("attaches a systems blueprint artifact during snapshot enrichment", () => {
    const departments = buildDepartments(emptyRaw(), null);
    const systems = departments.find((dept) => dept.id === "systems_architect")!;
    systems.detail = {
      systemsArchitectView: resolveSystemsArchitectHqView(
        evidenceFromHqSignals({ ventureType: "saas", monetizationModelType: "saas_subscription" }),
      ),
    };
    const snapshot = {
      generatedAt: new Date().toISOString(),
      venture: {
        ventureAssemblyId: "v1",
        organizationId: "org",
        missionId: "m1",
        opportunityId: null,
        companyId: null,
        ventureBlueprintId: null,
        buildId: null,
        productionArtifactId: null,
        ventureName: "SaaS demo",
        ventureType: "saas",
        assemblyStatus: "active",
        readinessStatus: null,
        launchStage: null,
        correlationIds: [],
      },
      overallStatus: "NOT_STARTED",
      currentDepartments: [],
      currentActivity: {
        active: false,
        departmentId: null,
        departmentLabel: null,
        engine: null,
        task: null,
        provider: null,
        model: null,
        status: null,
        startedAt: null,
        elapsedSeconds: null,
        attempt: null,
        costUsd: null,
        costKnown: false,
        artifactStatus: null,
        latestActivitySummary: null,
        latestActivityAt: null,
      },
      departments,
      pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
      activityFeed: [],
      providers: [],
      costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
      lineage: [],
      closedLoopRoute: {
        active: false,
        fromDepartmentId: null,
        viaDepartmentId: null,
        toDepartmentId: null,
        decisionType: null,
        missionId: null,
        missionStatus: null,
      },
      system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    } as OperatorVentureSnapshot;
    const enriched = enrichOperatorSnapshot(snapshot);
    expect(enriched.systemsArchitecture?.businessModel).toBe("SAAS");
    expect(enriched.systemsArchitecture?.ventureName).toBe("SaaS demo");
    expect(enriched.systemsArchitecture?.ventureId).toBe("v1");
    expect(enriched.systemsArchitecture?.monetizationLabel.length).toBeGreaterThan(0);
    expect(enriched.departments.find((dept) => dept.id === "systems_architect")?.workArtifacts?.[0]?.artifactType).toBe(
      "systems_blueprint",
    );
  });

  it("exposes inspector explanation data from the read model", () => {
    const view = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "saas",
        monetizationModelType: "saas_subscription",
        businessConcept: "B2B SaaS subscription product",
      }),
    );
    const crm = view.nodes.find((node) => node.family === "CRM");
    expect(crm).toBeTruthy();
    expect(crm?.purpose.length).toBeGreaterThan(20);
    expect(crm?.whyNeeded.length).toBeGreaterThan(10);
    expect(crm?.capabilities.some((item) => item.code === "CRM_PIPELINE" && item.label === "Sales pipeline")).toBe(true);
    expect(crm?.selectedProvider).toBeNull();
    expect(crm?.selectedProviderLabel).toBe("Not selected");
    expect(crm?.tenancyLabel.length).toBeGreaterThan(0);
    expect(crm?.procurementLabel.length).toBeGreaterThan(0);
    expect(crm?.costDisplay === "Unknown" || !crm?.costDisplay.startsWith("$0")).toBe(true);
    expect(crm?.writeAuthorityLabel).toBe("ARCHITECTURE ONLY");
    expect(crm?.writeAuthorityDetail).toBe("NOT AUTHORIZED");
    expect(view.liveWriteAuthorityLabel).toBe("NO");
    expect(view.nodes.filter((node) => node.status === "DEFERRED").every((node) => node.statusLabel === "Deferred")).toBe(true);
  });

  it("selects the first required node in dependency order", () => {
    const view = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "marketplace",
        monetizationModelType: "two_sided_marketplace",
        businessConcept: "Art marketplace connecting collectors and artists",
      }),
    );
    expect(view.defaultSelectedNodeId).toBe(selectDefaultSystemsArchitectNodeId(view.nodes));
    expect(view.defaultSelectedNodeId).toBe("IDENTITY_AND_ACCOUNTS");
    const again = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "marketplace",
        monetizationModelType: "two_sided_marketplace",
        businessConcept: "Art marketplace connecting collectors and artists",
      }),
    );
    expect(again.defaultSelectedNodeId).toBe(view.defaultSelectedNodeId);
  });

  it("does not fabricate required systems for an ambiguous venture", () => {
    const view = resolveSystemsArchitectHqView({});
    expect(view.businessModel).toBe("AMBIGUOUS");
    expect(view.evidenceInsufficient).toBe(true);
    expect(view.requiredCount).toBe(2);
    expect(view.nodes.filter((node) => node.required).map((node) => node.family).sort()).toEqual([
      "LEGAL_AND_COMPLIANCE",
      "SECURITY_AND_RISK",
    ]);
    expect(view.nodes.some((node) => node.family === "CRM" && node.required)).toBe(false);
    expect(view.nodes.some((node) => node.family === "PAYMENTS" && node.required)).toBe(false);
    expect(view.nodes.filter((node) => node.awaitingEvidence).every((node) => !node.required)).toBe(true);
    expect(view.clusters.filter((cluster) => cluster.kind === "AWAITING_BUSINESS_MODEL").every((cluster) => !cluster.containsRequired)).toBe(true);
    expect(view.nodes.every((node) => Boolean(node.family))).toBe(true);
    expect(view.nodes.some((node) => node.label === "Revenue Core")).toBe(false);
    expect(view.businessModelLabel).toBe("Model unresolved");
    expect(view.monetizationLabel).toBe("Not yet resolved");
    expect(view.architectureDisplayLabel).toBe("Partial — awaiting business-model resolution");
    expect(view.knownSystemLabels.sort()).toEqual(["Compliance", "Security"]);
    const foundation = view.clusters.find((cluster) => cluster.id === "foundation");
    const revenue = view.clusters.find((cluster) => cluster.id === "revenue");
    expect(foundation?.kind).toBe("KNOWN");
    expect(revenue?.kind).toBe("AWAITING_BUSINESS_MODEL");
    expect(foundation?.x ?? 99).toBeLessThan(revenue?.x ?? 0);
    expect(foundation?.width ?? 0).toBeGreaterThan(revenue?.width ?? 99);
    expect(view.unresolvedAreaLabels).toEqual([
      "Revenue",
      "Customer",
      "Communications",
      "Operations",
      "Growth",
      "Intelligence",
    ]);
    expect(view.unresolvedReason).toBe("Awaiting business-model resolution");
    expect(view.clusters.some((cluster) => cluster.id === "foundation" && cluster.containsRequired)).toBe(true);
    expect(view.evidenceMessage).toMatch(/does not yet have enough business-model evidence/i);
    expect(view.unresolvedWhy).toMatch(/until the business model is known/i);
    const named = resolveSystemsArchitectHqView({}, { ventureName: "Harbor Roofing" });
    expect(named.ventureName).toBe("Harbor Roofing");
    expect(named.evidenceMessage).toMatch(/Harbor Roofing/);
    expect(named.unresolvedWhy).toMatch(/Harbor Roofing/);
    expect(named.architectureStatusShort).toBe("MODEL REQUIRED");
  });

  it("lets SaaS and marketplace maps differ from the same read model", () => {
    const saas = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({ ventureType: "saas", monetizationModelType: "saas_subscription" }),
    );
    const marketplace = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "marketplace",
        monetizationModelType: "two_sided_marketplace",
        businessConcept: "Art marketplace",
      }),
    );
    expect(saas.nodes.some((node) => node.family === "CRM" && node.required)).toBe(true);
    expect(marketplace.nodes.some((node) => node.family === "CRM" && node.required)).toBe(false);
    expect(marketplace.nodes.some((node) => node.family === "PAYMENTS" && node.required)).toBe(true);
    expect(saas.nodes.map((node) => node.family).sort().join("|")).not.toBe(
      marketplace.nodes.map((node) => node.family).sort().join("|"),
    );
  });

  it("keeps inspector interactions read-only with keyboard-capable nodes", () => {
    const source = readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8");
    expect(source).toContain('type="button"');
    expect(source).toContain("aria-pressed");
    expect(source).toContain("aria-controls");
    expect(source).toContain("aria-label");
    expect(source).toContain("onClick");
    expect(source).toContain("data-incoming");
    expect(source).toContain("data-outgoing");
    expect(source).toContain("Dependents");
    expect(source).toContain("Systems Architect");
    expect(source).toContain("Operating Blueprint");
    expect(source).toContain("ventureName");
    expect(source).toContain("monetizationLabel");
    expect(source).toContain("architectureDisplayLabel");
    expect(source).toContain("data-node-kind=\"system\"");
    expect(source).toContain("systems-architect-topo");
    expect(source).toContain("systems-architect-floor-summary");
    expect(source).toContain("Known systems");
    expect(source).toContain("Unresolved areas");
    expect(source).toContain("data-systems-architect-known-preview");
    expect(source).toContain("Back to HQ");
    expect(source).toContain("resetSystemsArchitectInspectorScroll");
    expect(source).not.toContain("systems-architect-spine-systems");
    expect(source).not.toContain("systems-architect-mini-card");
    expect(source).not.toContain("systems-architect-mini-stage");
    expect(source).not.toContain("resolveVentureSystems");
    expect(source).not.toContain("requirementsForOperatingModel");
    expect(source).not.toMatch(/createCrmAccount|purchaseSubscription|writeStripe|executeExternalAction/);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.crmWrites).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.treasuryExternalMovements).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.eagActions).toBe(0);
    expect(VENTURE_SYSTEMS_WRITE_BOUNDARY.providerAccountCreations).toBe(0);
  });

  it("renders a topology preview and architecture canvas instead of stage cards", () => {
    const view = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({ ventureType: "saas", monetizationModelType: "saas_subscription" }),
    );
    expect(view.topologySpine.map((point) => point.title)).toEqual([
      "Model",
      "Revenue",
      "Customer",
      "Operations",
      "Intelligence",
    ]);
    expect(view.nodes.some((node) => node.family === "CRM" && node.label === "CRM")).toBe(true);
    expect(view.nodes.some((node) => node.family === "TRANSACTIONAL_EMAIL" && node.label === "Transactional Email")).toBe(true);
    expect(view.nodes.some((node) => node.family === "CUSTOMER_SUPPORT" && node.label === "Support")).toBe(true);
    expect(view.clusters.some((cluster) => cluster.title === "Customer" && cluster.kind === "KNOWN")).toBe(true);
    expect(view.topologySpine.some((point) => point.systemLabels.includes("Payments") || point.systemLabels.includes("Identity"))).toBe(true);
    expect(view.monetizationLabel.toLowerCase()).toMatch(/subscription/);
    expect(view.architectureStatusShort).toBeTruthy();
    expect(view.clusters.length).toBeGreaterThan(0);
    expect(view.edges.some((edge) => edge.kind === "DEPENDENCY") || view.edges.some((edge) => edge.kind === "PRESENTATION")).toBe(true);
    const identity = view.nodes.find((node) => node.family === "IDENTITY_AND_ACCOUNTS");
    expect(identity?.dependents.some((item) => item.id === "AUTHORIZATION_AND_ROLES")).toBe(true);
    expect(view.coverage.stateLabel.length).toBeGreaterThan(0);
    expect(view.requiredCount).toBeGreaterThan(0);
    expect(view.providerReadinessLabel.length).toBeGreaterThan(0);
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain(".systems-architect-canvas");
    expect(css).toContain(".systems-architect-dot");
    expect(css).toContain(".systems-architect-system");
    expect(css).toContain(".systems-architect-floor-summary");
    expect(css).toContain(".systems-architect-inspector");
    expect(css).toContain(".systems-architect-topo");
    expect(css).not.toMatch(/\.systems-architect-[^{]*\{[^}]*overflow-x:\s*(scroll|auto)/);
    const room = readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8");
    expect(room).not.toContain("systems-architect-mini-card");
    expect(room).toContain("is-dimmed");
    expect(room).toContain("is-incoming");
    expect(room).toContain("is-outgoing");
  });

  it("presents canonical model, monetization, and concrete systems without treating stages as systems", () => {
    const saas = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "saas",
        monetizationModelType: "saas_subscription",
        businessConcept: "B2B SaaS subscription product",
      }),
      { ventureName: "AI SEO Website Platform" },
    );
    expect(saas.businessModel).toBe("SAAS");
    expect(saas.businessModelLabel).toBe("SaaS");
    expect(saas.monetizationLabel).toBe("Recurring subscription");
    expect(saas.architectureDisplayLabel).not.toMatch(/AMBIGUOUS/);
    expect(saas.nodes.filter((node) => node.family).length).toBe(saas.nodes.length);
    expect(saas.nodes.some((node) => node.family === "CRM")).toBe(true);
    expect(saas.nodes.some((node) => node.family === "TRANSACTIONAL_EMAIL")).toBe(true);
    expect(saas.nodes.some((node) => node.family === "ANALYTICS")).toBe(true);
    expect(saas.defaultSelectedNodeId).toBeTruthy();
    expect(saas.nodes.find((node) => node.id === saas.defaultSelectedNodeId)?.family).toBeTruthy();
    expect(saas.clusters.map((cluster) => cluster.title).every((title) => !saas.nodes.some((node) => node.label === title && node.family == null))).toBe(true);

    const marketplace = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "marketplace",
        monetizationModelType: "two_sided_marketplace",
        businessConcept: "Art marketplace connecting collectors and artists",
      }),
    );
    expect(marketplace.monetizationLabel).toBe("Marketplace commission");

    const digital = resolveSystemsArchitectHqView(
      evidenceFromHqSignals({
        ventureType: "digital_product",
        monetizationModelType: "digital_products",
        businessConcept: "One-time downloadable digital product",
      }),
    );
    expect(digital.businessModelLabel).toBe("Digital Product");
    expect(digital.monetizationLabel).toBe("One-time purchase");

    const ambiguous = resolveSystemsArchitectHqView({}, { ventureName: "Autonomous Venture Cycle" });
    expect(ambiguous.ventureName).toBeNull();
    expect(ambiguous.entityKind).toBe("NONE");
    expect(ambiguous.hasArchitectureContext).toBe(false);
    expect(ambiguous.businessModelLabel).toBe("Model unresolved");
    expect(ambiguous.monetizationLabel).toBe("Not yet resolved");
    expect(ambiguous.unresolvedAreaLabels).not.toEqual(expect.arrayContaining(ambiguous.knownSystemLabels));
    expect(ambiguous.nodes.every((node) => node.family === "SECURITY_AND_RISK" || node.family === "LEGAL_AND_COMPLIANCE")).toBe(true);

    const namedAmbiguous = resolveSystemsArchitectHqView(
      {},
      { entityKind: "OPPORTUNITY_CANDIDATE", entityId: "cand-rfp", entityName: "AI-Powered RFP & Security Platform", ventureName: "AI-Powered RFP & Security Platform" },
    );
    expect(namedAmbiguous.entityName).toBe("AI-Powered RFP & Security Platform");
    expect(namedAmbiguous.ventureName).toBe("AI-Powered RFP & Security Platform");
    expect(namedAmbiguous.entityKind).toBe("OPPORTUNITY_CANDIDATE");

    const source = readFileSync(join(COMPONENTS, "systems-architect-blueprint.tsx"), "utf8");
    expect(source).toContain("Operating Blueprint");
    expect(source).toContain("Opportunity Blueprint");
    expect(source).toContain("Why required for this entity");
    expect(source).toContain("data-cluster-kind");
    expect(source).not.toMatch(/createCrmAccount|purchaseSubscription|writeStripe|executeExternalAction/);
  });
});
