import type { CommercialHealthStatus } from "../types";
import type { CommercializationStore } from "../store";

export type CommercialHealthReport = {
  status: CommercialHealthStatus;
  checks: Record<string, boolean>;
  blockers: string[];
};

export function evaluateCommercialHealth(store: CommercializationStore, input: { organizationId: string; ventureId: string }): CommercialHealthReport {
  const domain = [...store.domainAssets.values()].find(
    (d) => d.organizationId === input.organizationId && d.ventureId === input.ventureId && d.status === "REGISTERED",
  );
  const dns = [...store.dnsStates.values()].find(
    (d) => d.organizationId === input.organizationId && d.ventureId === input.ventureId,
  );
  const deployment = [...store.deploymentAssets.values()].find(
    (d) => d.organizationId === input.organizationId && d.ventureId === input.ventureId,
  );
  const product = [...store.products.values()].find(
    (p) => p.organizationId === input.organizationId && p.ventureId === input.ventureId && p.status !== "DRAFT",
  );
  const checkout = [...store.checkouts.values()].find(
    (c) => c.organizationId === input.organizationId && c.ventureId === input.ventureId && c.status === "READY",
  );
  const revenueEvents = [...store.paymentEvents.values()].filter(
    (e) => e.organizationId === input.organizationId && e.ventureId === input.ventureId,
  );

  const checks = {
    domainRegistered: Boolean(domain),
    dnsResolved: dns?.status === "SYNCED",
    httpsHealthy: deployment?.domainAttached ?? false,
    deploymentHealthy: deployment?.deployed ?? false,
    checkoutReachable: Boolean(checkout?.checkoutUrl),
    webhookHealthy: revenueEvents.length > 0,
    paymentConfigurationActive: Boolean(product),
    fulfillmentConfigured: [...store.entitlements.values()].some(
      (e) => e.organizationId === input.organizationId && e.ventureId === input.ventureId,
    ),
    revenueTelemetryActive: revenueEvents.some((e) => e.amountTruth === "ACTUAL"),
  };

  const blockers: string[] = [];
  if (!checks.domainRegistered) blockers.push("domain not registered");
  if (!checks.dnsResolved) blockers.push("dns not synced");
  if (!checks.deploymentHealthy) blockers.push("deployment not healthy");
  if (!checks.paymentConfigurationActive) blockers.push("payments not configured");
  if (!checks.checkoutReachable) blockers.push("checkout not ready");

  let status: CommercialHealthStatus = "READY";
  if (blockers.length > 0 && checks.domainRegistered) status = "DEGRADED";
  if (!checks.domainRegistered && !checks.deploymentHealthy) status = "BLOCKED";

  return { status, checks, blockers };
}
