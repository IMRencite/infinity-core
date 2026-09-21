import type { ReactNode } from "react";
import Link from "next/link";
import { projectCanonicalVentureHqDetail } from "@/lib/infinity/second-venture-factory/hq";
import { projectOccupancynpvHqDetail, type CanonicalHqVentureProjection } from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { CanonicalVentureImprovement } from "./canonical-venture-improvement";
import { CanonicalVentureOfferArchitecture } from "./canonical-venture-offer-architecture";
import { CustomerSuggestionsTab } from "./customer-suggestions-tab";
import { projectVentureSystemQcHqSummary } from "@/lib/infinity/universal-venture-system-qc/hq";
import { projectVentureOfferArchitectureHq } from "@/lib/infinity/offer-architecture/hq";
import { projectVentureCurrentWork } from "@/lib/infinity/canonical-work";
import { UniversalArtifactQcPanel } from "./universal-artifact-qc-panel";

function ExternalUrl({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="break-all text-sky-400 underline" target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function CurrentWorkSection({ ventureId }: { ventureId: string }) {
  const work = projectVentureCurrentWork(ventureId);
  if (!work.current_work && !work.latest_completed && !work.latest_venture_work && !work.parked_authorization) return null;
  return (
    <Section title="Current Work">
      <Row label="Current active work" value={work.current_work ?? "IDLE"} />
      <Row label="Current mission" value={work.current_mission ?? "NONE"} />
      <Row label="Status" value={work.status ?? "IDLE"} />
      {work.current_work ? (
        <>
          <Row label="Current stage" value={work.current_stage} />
          <Row label="Assigned rooms" value={work.assigned_rooms} />
          <Row label="Assigned workers" value={work.assigned_workers || "—"} />
          <Row label="Latest output" value={work.latest_output} />
          <Row label="Source" value={work.source} />
          <Row label="Started" value={work.started} />
          <Row label="Traceability" value={<span className="break-all font-mono text-xs">{work.traceability}</span>} />
        </>
      ) : null}
      <Row label="Latest venture work" value={work.latest_venture_work ?? "NONE"} />
      <Row label="Latest venture work at" value={work.latest_venture_work_at ?? "—"} />
      <Row label="Latest completed (any)" value={work.latest_completed ?? "NONE"} />
      {work.parked_authorization ? (
        <Row label="Parked authorization" value={work.parked_authorization} />
      ) : null}
    </Section>
  );
}

function RecentVentureWorkSection({ ventureId }: { ventureId: string }) {
  const work = projectVentureCurrentWork(ventureId);
  if (!work.recent_venture_work.length && !work.recent_system_activity.length) return null;
  return (
    <>
      {work.recent_venture_work.length > 0 ? (
        <Section title="Recent Venture Work History">
          {work.recent_venture_work.map((row) => (
            <Row
              key={row.trace}
              label={row.mission}
              value={`${row.classification} · ${row.status}${row.completed ? ` · ${row.completed}` : ""} · ${row.latest_output}`}
            />
          ))}
        </Section>
      ) : null}
      {work.recent_system_activity.length > 0 ? (
        <Section title="System Activity History">
          {work.recent_system_activity.map((row) => (
            <Row
              key={row.trace}
              label={row.mission}
              value={`${row.classification} · ${row.status}${row.completed ? ` · ${row.completed}` : ""}`}
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-100">{value}</dd>
    </div>
  );
}

export function CanonicalVentureHqDetail({
  ventureId,
  projection,
}: {
  ventureId: string;
  projection?: CanonicalHqVentureProjection | null;
}) {
  const detail = projectCanonicalVentureHqDetail(ventureId) ?? projectOccupancynpvHqDetail();
  const ventureQc = detail?.ventureSystemQc ?? projectVentureSystemQcHqSummary(ventureId);
  const offerView = projectVentureOfferArchitectureHq(ventureId);
  if (!detail) {
    return (
      <div className="rounded-lg border border-white/10 p-4 text-sm text-zinc-400">
        Canonical venture projection unavailable for {ventureId}.
        {projection ? ` Lifecycle ${projection.lifecycle}.` : ""}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-hq-region="canonical-venture-detail">
      <section className="rounded-lg border border-white/10 p-4" data-hq-region="customer-suggestions-panel">
        <h2 className="text-sm font-semibold text-white">Customer Suggestions</h2>
        <div className="mt-3">
          <CustomerSuggestionsTab ventureId={ventureId} />
        </div>
      </section>
      <CanonicalVentureOfferArchitecture view={offerView} />
      <CanonicalVentureImprovement ventureId={ventureId} />
      <Section title="Overview">
        <Row label="Venture" value={detail.overview.name} />
        <Row label="Venture ID" value={<span className="break-all font-mono text-xs">{detail.overview.ventureId}</span>} />
        <Row label="Domain" value={<ExternalUrl href={detail.overview.productionUrl} label={detail.overview.domain} />} />
        <Row label="Production URL" value={<ExternalUrl href={detail.overview.productionUrl} label={detail.overview.productionUrl} />} />
        <Row label="Paid app" value={<ExternalUrl href={detail.overview.paidAppUrl} label={detail.overview.paidAppUrl} />} />
        <Row
          label="Open product as Founder/QA"
          value={<ExternalUrl href="https://occupancynpv.com/occupancynpv/app/login" label="Sign in to inspect OccupancyNPV (no purchase)" />}
        />
        <Row label="Lifecycle" value={detail.overview.lifecycle} />
        <Row label="Public launch" value={detail.overview.publicLaunch} />
        <Row label="Selected / first activation" value={detail.overview.selectedAt ?? "—"} />
      </Section>
      <CurrentWorkSection ventureId={ventureId} />
      <RecentVentureWorkSection ventureId={ventureId} />
      <Section title="Product">
        <Row label="Description" value={detail.product.description} />
        <Row label="Production app" value={<ExternalUrl href={detail.product.productionAppUrl} label={detail.product.productionAppUrl} />} />
        <Row label="Artifact" value={String(detail.product.artifactId)} />
        <Row label="Digest" value={<span className="break-all font-mono text-xs">{String(detail.product.artifactDigest)}</span>} />
        <Row label="Deployment" value={String(detail.product.deploymentId)} />
        <Row label="Product readiness" value={detail.product.productReadiness} />
        <Row label="Auth" value={detail.product.auth} />
        <Row label="Persistence" value={detail.product.persistence} />
        <Row label="Tenant isolation" value={detail.product.tenantIsolation} />
      </Section>
      <Section title="Backend">
        <Row label="Backend" value={detail.backend.backend} />
        <Row label="Provider" value={detail.backend.provider} />
        <Row label="Auth" value={detail.backend.auth} />
        <Row label="Persistence" value={detail.backend.persistence} />
        <Row label="API" value={detail.backend.api} />
        <Row label="Fulfillment integration" value={detail.backend.fulfillmentIntegration} />
        <Row label="Observability" value={detail.backend.observability} />
        <Row label="BackendReadinessGate" value={detail.backend.backendReadinessGate} />
        <Row label="Architecture" value={detail.backend.architecture} />
        <Row label="Business logic" value={detail.backend.businessLogic} />
        <Row label="Jobs" value={detail.backend.jobs} />
        <Row label="Webhooks" value={detail.backend.webhooks} />
        <Row label="Security" value={detail.backend.security} />
        <Row label="Recovery" value={detail.backend.recovery} />
      </Section>
      <Section title="Commercial">
        <Row label="Professional" value={detail.commercial.professional} />
        <Row label="Per-Deal" value={detail.commercial.perDeal} />
        <Row label="Billing" value={detail.commercial.billingModel} />
        <Row label="Provider" value={detail.commercial.paymentProvider} />
        <Row label="Payment activation" value={detail.commercial.paymentActivation} />
        <Row label="Payment health" value={"payment" in detail.commercial ? String(detail.commercial.payment) : "UNKNOWN"} />
        <Row label="Payment path health" value={"paymentPathHealth" in detail.commercial ? String(detail.commercial.paymentPathHealth) : "UNKNOWN"} />
        <Row label="Last live verification" value={"lastLiveVerification" in detail.commercial ? String(detail.commercial.lastLiveVerification ?? "NEVER") : "UNKNOWN"} />
        <Row label="Next verification" value={"nextVerification" in detail.commercial ? String(detail.commercial.nextVerification ?? "UNSCHEDULED") : "UNKNOWN"} />
        <Row label="Offers healthy" value={"offersHealthy" in detail.commercial ? String(detail.commercial.offersHealthy) : "UNKNOWN"} />
        <Row label="Credential capability" value={"credentialCapability" in detail.commercial ? String(detail.commercial.credentialCapability) : "UNKNOWN"} />
        <Row label="Webhook health" value={"webhookHealth" in detail.commercial ? String(detail.commercial.webhookHealth) : "UNKNOWN"} />
        <Row label="Fulfillment mapping" value={"fulfillmentMapping" in detail.commercial ? String(detail.commercial.fulfillmentMapping) : "UNKNOWN"} />
        <Row label="Checkout" value={detail.commercial.checkout} />
        <Row label="Checkout health" value={"checkoutHealth" in detail.commercial ? String(detail.commercial.checkoutHealth) : "UNKNOWN"} />
        <Row label="Current incident" value={"currentIncident" in detail.commercial ? String(detail.commercial.currentIncident ?? "NONE") : "NONE"} />
        <Row label="Commercial incident" value={"commercialIncident" in detail.commercial ? String(detail.commercial.commercialIncident ?? "NONE") : "NONE"} />
        <Row label="Webhook" value={String(detail.commercial.webhook)} />
        <Row label="Analytics" value={String(detail.commercial.analytics)} />
        <Row label="Blockers" value={detail.commercial.blockers.join(", ") || "NONE"} />
      </Section>
      <Section title="Fulfillment">
        <Row label="FulfillmentReadinessGate" value={detail.fulfillment.gate} />
        <Row label="Professional entitlement" value={detail.fulfillment.professionalEntitlement} />
        <Row label="Per-Deal entitlement" value={detail.fulfillment.perDealEntitlement} />
        <Row label="Failure recovery" value={detail.fulfillment.failureRecovery} />
        <Row label="Orphaned paid customers" value={detail.fulfillment.orphanedPaidCustomerCount} />
      </Section>
      <Section title="Performance">
        <Row label="Experiment" value={String(detail.performance.experimentId)} />
        <Row label="Experiment state" value={String(detail.performance.experimentState)} />
        <Row label="Observations" value={String(detail.performance.observations)} />
        <Row label="Learning decisions" value={String(detail.performance.learningDecisions)} />
        <Row label="KPIs" value={detail.performance.kpis.join(", ") || "EMPTY"} />
      </Section>
      <Section title="Growth">
        <Row label="Organic" value={String(detail.growth.organic)} />
        <Row label="Outreach" value={String(detail.growth.outreach)} />
        <Row label="Creative / media" value={detail.growth.creativeMedia} />
        <Row label="Acquisition experiments" value={String(detail.growth.activeAcquisitionExperiments)} />
      </Section>
      <Section title="Operations">
        <Row label="Active missions" value={detail.operations.activeMissions.join(", ") || "NONE"} />
        <Row label="Latest completed / learning" value={String(detail.operations.latestCompletedMission)} />
        <Row label="Latest blocker" value={detail.operations.latestBlocker} />
        <Row label="Latest state transition" value={String(detail.operations.latestStateTransition)} />
        <Row label="Daily operating cycle" value={detail.operations.dailyCycle ?? "UNAVAILABLE"} />
        <Row label="Current action" value={detail.operations.currentAction ?? "NO_ACTION_REQUIRED"} />
        <Row label="Latest diagnosis" value={detail.operations.latestDiagnosis ?? "NONE"} />
        <Row label="Latest OptimizationOpportunity" value={detail.operations.latestOptimizationOpportunity ?? "NONE"} />
        <Row label="Latest LearningDecision" value={detail.operations.latestLearningDecision ?? "NONE"} />
      </Section>
      <UniversalArtifactQcPanel ventureId={ventureId} />
      <Section title="Venture QC">
        <Row label="Overall QC" value={ventureQc.overall} />
        <Row label="Overall Quality" value={ventureQc.overall_quality} />
        <Row label="Coverage" value={`${ventureQc.coverage_percent}%`} />
        <Row label="Route Coverage" value={`${ventureQc.route_coverage}%`} />
        <Row label="Visual Coverage" value={`${ventureQc.visual_coverage}%`} />
        <Row label="Interaction Coverage" value={`${ventureQc.interaction_coverage}%`} />
        <Row label="Workflow Coverage" value={`${ventureQc.workflow_coverage}%`} />
        <Row label="Subsystem Coverage" value={`${ventureQc.subsystem_coverage}%`} />
        <Row label="Mobile Coverage" value={`${ventureQc.mobile_coverage}%`} />
        <Row label="Accessibility Coverage" value={`${ventureQc.accessibility_coverage}%`} />
        <Row label="Freshness" value={ventureQc.freshness} />
        <Row label="Failed systems" value={ventureQc.failed_systems.join(", ") || "NONE"} />
        <Row label="Unknown systems" value={ventureQc.unknown_systems.join(", ") || "NONE"} />
        <Row label="Last full QC" value={ventureQc.last_full_qc ?? "NONE"} />
        <Row label="Last smoke QC" value={ventureQc.last_smoke_qc ?? "NONE"} />
        <Row label="Current incidents" value={ventureQc.current_incidents.join(", ") || "NONE"} />
        <Row label="Failure detail" value={ventureQc.failure_detail.join(" · ") || "NONE"} />
        <Row label="Evidence" value={ventureQc.evidence_refs.join(", ") || "NONE"} />
        <Row
          label="Public Site"
          value={ventureQc.systems.find((row) => row.id === "PUBLIC_SITE")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Product"
          value={ventureQc.systems.find((row) => row.id === "PRODUCT_WORKFLOW")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Auth"
          value={ventureQc.systems.find((row) => row.id === "AUTH")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Payments"
          value={ventureQc.systems.find((row) => row.id === "PAYMENT")?.status ?? "UNKNOWN"}
        />
        <Row label="Commercial Offer" value={ventureQc.commercial_offer} />
        <Row label="Active Offer" value={ventureQc.active_offer} />
        <Row label="Rendered Offer" value={ventureQc.rendered_offer} />
        <Row label="Offer Parity" value={ventureQc.offer_parity} />
        <Row label="Offer Disclosure" value={ventureQc.offer_disclosure} />
        <Row label="Offer Journey" value={ventureQc.offer_journey} />
        <Row label="Offer Measurement" value={ventureQc.offer_measurement} />
        <Row label="Purchase Friction" value={ventureQc.purchase_friction} />
        <Row label="Time to Value" value={ventureQc.time_to_value} />
        <Row
          label="Fulfillment"
          value={ventureQc.systems.find((row) => row.id === "FULFILLMENT")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Growth"
          value={ventureQc.systems.find((row) => row.id === "GROWTH")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Feedback"
          value={ventureQc.systems.find((row) => row.id === "IMPROVEMENT_INTAKE")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Email"
          value={ventureQc.systems.find((row) => row.id === "EMAIL")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Analytics"
          value={ventureQc.systems.find((row) => row.id === "ANALYTICS")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Legal"
          value={ventureQc.systems.find((row) => row.id === "LEGAL")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Responsive"
          value={ventureQc.systems.find((row) => row.id === "RESPONSIVE")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Accessibility"
          value={ventureQc.systems.find((row) => row.id === "ACCESSIBILITY")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Console"
          value={ventureQc.systems.find((row) => row.id === "CONSOLE")?.status ?? "UNKNOWN"}
        />
        <Row
          label="Network"
          value={ventureQc.systems.find((row) => row.id === "NETWORK")?.status ?? "UNKNOWN"}
        />
      </Section>
      <Section title="Customer-facing UI QC">
        <Row label="Customer-facing UI QC" value={detail.customerFacingUi.customerFacingUiQc} />
        <Row label="Affected routes" value={detail.customerFacingUi.affectedRoutes.join(", ") || "NONE"} />
        <Row label="Latest rendered validation" value={detail.customerFacingUi.latestRenderedValidation ?? "NONE"} />
        <Row label="Founder review" value={detail.customerFacingUi.founderReview} />
        <Row label="Founder dashboard review" value={detail.founderDashboardReview} />
        <Row label="Returning customer access QC" value={detail.customerFacingUi.returningCustomerAccessQc ?? "UNAVAILABLE"} />
        <Row label="Commercial CTA QC" value={detail.customerFacingUi.commercialCtaQc ?? "UNAVAILABLE"} />
        <Row label="Product Dashboard QC" value={detail.customerFacingUi.productDashboardQc ?? "UNAVAILABLE"} />
        <Row label="Empty State QC" value={detail.customerFacingUi.emptyStateQc ?? "UNAVAILABLE"} />
        <Row label="Product Result QC" value={detail.customerFacingUi.productResultQc ?? "UNAVAILABLE"} />
        <Row label="Collection Scalability QC" value={detail.customerFacingUi.collectionScalabilityQc ?? "UNAVAILABLE"} />
        <Row label="Collection Lifecycle QC" value={detail.customerFacingUi.collectionLifecycleQc ?? "UNAVAILABLE"} />
        <Row label="Sub-item Discoverability QC" value={detail.customerFacingUi.subItemDiscoverabilityQc ?? "UNAVAILABLE"} />
        <Row label="Selected Item State QC" value={detail.customerFacingUi.selectedItemStateQc ?? "UNAVAILABLE"} />
        <Row label="Latest result validation" value={detail.customerFacingUi.latestResultValidation ?? "NONE"} />
        <Row label="Messaging consistency" value={detail.customerFacingUi.messagingConsistency ?? "UNAVAILABLE"} />
        <Row label="Founder QA access" value={detail.customerFacingUi.founderQaAccess ?? "UNAVAILABLE"} />
      </Section>
      <Section title="Governance">
        <Row label="Routine provider mutation authority" value={detail.governance.routineProviderMutationAuthority} />
        <Row label="Payment activation authority" value={detail.governance.paymentActivationAuthority} />
        <Row label="Pending founder action" value={detail.governance.pendingFounderAction} />
        <Row label="Marketing surfaces" value={detail.governance.founderProductReview.marketingSurfaces} />
        <Row label="New paid-product UI" value={detail.governance.founderProductReview.newPaidProductUi} />
      </Section>
      <p className="text-xs text-zinc-500">
        HQ reports Infinity state. It does not become another decision engine.{" "}
        <Link href="/dashboard/ventures" className="text-sky-400 underline">Back to Ventures</Link>
      </p>
    </div>
  );
}
