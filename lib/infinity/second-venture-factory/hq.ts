import { projectVentureBackendHq } from "@/lib/infinity/venture-backend-architecture";
import {
  evaluateVentureHQProjectionGate,
  isOccupancynpvRecord,
  listCanonicalVenturesForHq,
  mergeCanonicalVenturesIntoHqList,
  projectCanonicalVentureForHq,
  projectOccupancynpvHqDetail,
} from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { readVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import type { VentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/types";
import { ASKREVIEW_LOGIN_PATH, ASKREVIEW_VENTURE_ID } from "./constants";
import { projectVentureSystemQcHqSummary } from "@/lib/infinity/universal-venture-system-qc/hq";
import { askReviewVentureBackendContract } from "./backend";

export function projectGenericVentureHqDetail(record: VentureOperationalRecord) {
  const projected = projectCanonicalVentureForHq(record);
  const backend = record.venture_id === ASKREVIEW_VENTURE_ID
    ? {
        ...projectVentureBackendHq({ ventureId: record.venture_id, templateType: "generated_report", customerAuth: true }),
        provider: askReviewVentureBackendContract().providerBindings.map((row) => row.providerFamily).join(", "),
        architecture: askReviewVentureBackendContract().productType,
      }
    : projectVentureBackendHq({ ventureId: record.venture_id, customerAuth: true });
  return {
    overview: {
      name: projected.name,
      ventureId: record.venture_id,
      internalName: record.venture_name,
      domain: projected.domain ?? "UNCONFIGURED",
      productionUrl: projected.productionUrl ?? "/askreview",
      paidAppUrl: projected.paidAppUrl ?? "/askreview/app",
      lifecycle: projected.lifecycle,
      publicLaunch: projected.publicLaunch,
      launchedAt: null,
      selectedAt: record.latest_learning_decision !== "UNCONFIGURED" ? record.latest_learning_decision : null,
    },
    product: {
      description: record.primary_offer,
      productionAppUrl: projected.paidAppUrl ?? "/askreview/app",
      artifactId: record.active_artifact,
      artifactDigest: record.active_artifact_digest,
      deploymentId: record.active_deployment,
      productReadiness: projected.product,
      auth: "SUPABASE_AUTH",
      persistence: "SUPABASE_ASKREVIEW_TABLES",
      tenantIsolation: "RLS_CUSTOMER_SCOPED",
      returningUserPath: ASKREVIEW_LOGIN_PATH,
    },
    commercial: {
      professional: record.monetization_model,
      perDeal: "NOT_APPLICABLE",
      offer: record.primary_offer,
      price: record.monetization_model,
      billingModel: record.business_model,
      paymentProvider: record.payment_provider,
      paymentConfiguration: "UNCONFIGURED",
      paymentActivation: projected.paymentActivation,
      checkout: projected.checkout,
      webhook: "UNCONFIGURED",
      analytics: record.analytics_provider,
      blockers: projected.blockers,
    },
    fulfillment: {
      gate: projected.fulfillmentGate,
      state: record.fulfillment_state,
      type: "GENERATED_REPORT",
      professionalEntitlement: "ASKREVIEW_KIT_ACCESS",
      perDealEntitlement: "NOT_APPLICABLE",
      failureRecovery: "DELIVERY_RETRY",
      orphanedPaidCustomerCount: 0,
    },
    backend,
    performance: {
      experimentId: record.current_experiment,
      experimentState: record.current_metric_state,
      observations: "EMPTY",
      learningDecisions: record.latest_learning_decision,
      kpis: record.primary_kpis,
    },
    growth: {
      organic: record.acquisition_state,
      outreach: record.outreach_strategy,
      creativeMedia: "UNCONFIGURED",
      activeAcquisitionExperiments: "NONE",
      searchProvider: record.search_console_binding,
    },
    operations: {
      activeMissions: record.current_missions,
      latestCompletedMission: record.latest_learning_decision,
      latestBlocker: projected.blockers[0] ?? "NONE",
      latestStateTransition: record.latest_learning_decision,
      dailyCycle: "NOT_YET",
      currentAction: projected.blockers[0] ?? "NONE",
      latestDiagnosis: "NONE",
      latestOptimizationOpportunity: "NONE",
      latestLearningDecision: record.latest_learning_decision,
    },
    customerFacingUi: {
      customerFacingUiQc: "IN_REPO",
      affectedRoutes: ["/askreview", "/askreview/app", "/askreview/app/login"],
      latestRenderedValidation: "NONE",
      founderReview: "NOT_REQUESTED",
      returningCustomerAccessQc: "PASS",
      commercialCtaQc: "IN_REPO",
      productDashboardQc: "IN_REPO",
      emptyStateQc: "IN_REPO",
      productResultQc: "IN_REPO",
      collectionScalabilityQc: "IN_REPO",
      collectionLifecycleQc: "IN_REPO",
      subItemDiscoverabilityQc: "IN_REPO",
      selectedItemStateQc: "IN_REPO",
      latestResultValidation: "NONE",
      messagingConsistency: "NOT_PUBLICLY_LAUNCHED",
      founderQaAccess: "UNAVAILABLE",
    },
    founderDashboardReview: "NOT_REQUESTED",
    ventureSystemQc: projectVentureSystemQcHqSummary(record.venture_id),
    governance: {
      routineProviderMutationAuthority: "NO_NEW_SPEND",
      paymentActivationAuthority: "FOUNDER_APPROVAL_REQUIRED",
      pendingFounderAction: projected.blockers[0] ?? "NONE",
      founderLaunchAuthorization: "FOUNDER_APPROVAL_REQUIRED",
      founderProductReview: {
        marketingSurfaces: "IN_REPO",
        newPaidProductUi: "IN_REPO",
      },
    },
  };
}

export function projectCanonicalVentureHqDetail(ventureId: string) {
  const record = readVentureOperationalRecord(ventureId)
    ?? listCanonicalVenturesForHq().find((row) => row.venture_id === ventureId)
    ?? null;
  if (!record) return null;
  if (isOccupancynpvRecord(record)) return projectOccupancynpvHqDetail();
  return projectGenericVentureHqDetail(record);
}

export function evaluateSecondVentureHqProjection(): { result: "PASS" | "FAIL"; reasons: string[] } {
  const record = readVentureOperationalRecord(ASKREVIEW_VENTURE_ID)
    ?? listCanonicalVenturesForHq().find((row) => row.venture_id === ASKREVIEW_VENTURE_ID)
    ?? null;
  if (!record) return { result: "FAIL", reasons: ["askreview_record_missing"] };
  const merged = mergeCanonicalVenturesIntoHqList([]);
  return evaluateVentureHQProjectionGate({ record, hqItems: merged });
}
