import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { CommercializationStore } from "../store";

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

/** Build HQ artifacts from commercialization store snapshot (dry-run / read model) */
export function buildCommercializationArtifacts(
  store: CommercializationStore,
  input: { organizationId: string; ventureId: string },
): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};

  for (const domain of store.domainAssets.values()) {
    if (domain.organizationId !== input.organizationId || domain.ventureId !== input.ventureId) continue;
    push(map, "launch_operations", {
      id: buildArtifactRenderId({
        artifactType: "commercial_domain",
        sourceRecordType: "domain_asset",
        sourceRecordId: domain.id,
      }),
      roomId: "launch_operations",
      artifactType: "commercial_domain",
      title: domain.domain,
      subtitle: domain.registrar,
      state: domain.status === "REGISTERED" ? "READY" : "CREATING",
      createdAt: domain.registeredAt,
      sourceRecordType: "domain_asset",
      sourceRecordId: domain.id,
      metadata: {
        status: domain.status,
        registrationPriceUsd: domain.registrationPriceUsd,
        renewalPriceUsd: domain.renewalPriceUsd ?? null,
        priceTruth: domain.priceTruth,
        verificationState: domain.verificationState,
      },
    });
  }

  for (const dns of store.dnsStates.values()) {
    if (dns.organizationId !== input.organizationId || dns.ventureId !== input.ventureId) continue;
    push(map, "launch_operations", {
      id: buildArtifactRenderId({
        artifactType: "commercial_dns",
        sourceRecordType: "dns_desired_state",
        sourceRecordId: dns.id,
      }),
      roomId: "launch_operations",
      artifactType: "commercial_dns",
      title: `DNS · ${dns.zoneName}`,
      subtitle: dns.provider,
      state: dns.status === "SYNCED" ? "READY" : dns.status === "FAILED" ? "FAILED" : "CREATING",
      createdAt: null,
      sourceRecordType: "dns_desired_state",
      sourceRecordId: dns.id,
      metadata: { status: dns.status, recordCount: dns.records.length },
    });
  }

  for (const dep of store.deploymentAssets.values()) {
    if (dep.organizationId !== input.organizationId || dep.ventureId !== input.ventureId) continue;
    push(map, "launch_operations", {
      id: buildArtifactRenderId({
        artifactType: "deployment",
        sourceRecordType: "venture_deployment_asset",
        sourceRecordId: dep.id,
      }),
      roomId: "launch_operations",
      artifactType: "deployment",
      title: dep.customDomain ?? dep.deploymentUrl ?? "Deployment",
      subtitle: dep.status,
      state: dep.publiclyLaunched ? "SELECTED" : dep.deployed ? "READY" : "CREATING",
      createdAt: dep.verifiedAt,
      sourceRecordType: "venture_deployment_asset",
      sourceRecordId: dep.id,
      metadata: {
        productionReady: dep.productionReady,
        deployed: dep.deployed,
        domainAttached: dep.domainAttached,
        publiclyLaunched: dep.publiclyLaunched,
        endpoint: dep.deploymentUrl,
      },
    });
  }

  for (const product of store.products.values()) {
    if (product.organizationId !== input.organizationId || product.ventureId !== input.ventureId) continue;
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "commercial_payment",
        sourceRecordType: "commercial_product",
        sourceRecordId: product.id,
      }),
      roomId: "strategy_finance",
      artifactType: "commercial_payment",
      title: product.name,
      subtitle: product.businessModel,
      state: product.status === "ACTIVE" ? "SELECTED" : product.status === "CONFIGURED" ? "READY" : "CREATING",
      createdAt: null,
      sourceRecordType: "commercial_product",
      sourceRecordId: product.id,
      metadata: {
        provider: product.provider,
        live: product.status === "ACTIVE" || product.status === "CONFIGURED",
        plan: "LIVE",
      },
    });
  }

  for (const checkout of store.checkouts.values()) {
    if (checkout.organizationId !== input.organizationId || checkout.ventureId !== input.ventureId) continue;
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "commercial_checkout",
        sourceRecordType: "commercial_checkout_configuration",
        sourceRecordId: checkout.id,
      }),
      roomId: "strategy_finance",
      artifactType: "commercial_checkout",
      title: "Checkout",
      subtitle: checkout.status,
      state: checkout.status === "READY" ? "READY" : "CREATING",
      createdAt: null,
      sourceRecordType: "commercial_checkout_configuration",
      sourceRecordId: checkout.id,
      metadata: { checkoutUrl: checkout.checkoutUrl, status: checkout.status },
    });
  }

  for (const event of store.paymentEvents.values()) {
    if (event.organizationId !== input.organizationId || event.ventureId !== input.ventureId) continue;
    if (event.eventType !== "PAYMENT_SUCCEEDED") continue;
    push(map, "intelligence_center", {
      id: buildArtifactRenderId({
        artifactType: "commercial_revenue",
        sourceRecordType: "commercial_payment_event",
        sourceRecordId: event.id,
      }),
      roomId: "intelligence_center",
      artifactType: "commercial_revenue",
      title: "Actual revenue",
      subtitle: event.netAmountUsd != null ? `$${event.netAmountUsd.toFixed(2)} ACTUAL` : "NOT YET MEASURED",
      state: "READY",
      createdAt: event.createdAt,
      sourceRecordType: "commercial_payment_event",
      sourceRecordId: event.id,
      metadata: {
        grossAmountUsd: event.grossAmountUsd,
        netAmountUsd: event.netAmountUsd,
        amountTruth: event.amountTruth,
        provider: event.provider,
      },
    });
  }

  const budget = store.budgetForVenture(input.organizationId, input.ventureId);
  if (budget) {
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "commercial_treasury",
        sourceRecordType: "venture_commercial_budget",
        sourceRecordId: budget.id,
      }),
      roomId: "strategy_finance",
      artifactType: "commercial_treasury",
      title: "Venture Treasury",
      subtitle: budget.authorizedBudgetUsd != null ? `$${budget.authorizedBudgetUsd.toFixed(2)} authorized` : "UNKNOWN",
      state: "READY",
      createdAt: null,
      sourceRecordType: "venture_commercial_budget",
      sourceRecordId: budget.id,
      metadata: {
        actualSpendUsd: budget.actualSpendUsd,
        actualRevenueUsd: budget.actualRevenueUsd,
        budgetTruth: budget.budgetTruth,
        revenueTruth: budget.revenueTruth,
      },
    });
  }

  return map;
}
