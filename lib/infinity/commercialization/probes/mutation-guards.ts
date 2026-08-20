import { MockDnsProvider, MockHostingProvider, MockPaymentProvider, MockRegistrarProvider } from "../providers/mock";
import { wrapDnsReadOnly, wrapHostingReadOnly, wrapPaymentsReadOnly, wrapRegistrarReadOnly } from "./read-only-adapters";
import { ReadOnlyMutationBlockedError } from "./mode";
import { assertGatewayBackedExecution } from "../gateway/action-bridge";
import { registerDomainWithAuthority, createDomainRequirement } from "../domain/register-domain";
import { CommercializationStore } from "../store";
import { ensureVentureBudget } from "../treasury/spend-authority";
import type { DomainCandidate } from "../types";

export type MutationGuardReport = {
  domainRegisterBlocked: boolean;
  domainRegisterCalls: number;
  domainRegisterCode: string | null;
  dnsMutationBlocked: boolean;
  dnsCreateCalls: number;
  dnsMutationCode: string | null;
  hostingDeployBlocked: boolean;
  hostingDeployCalls: number;
  hostingMutationCode: string | null;
  paymentProductBlocked: boolean;
  paymentProductCalls: number;
  paymentMutationCode: string | null;
  treasuryBypassBlocked: boolean;
};

export async function exerciseMutationGuards(): Promise<MutationGuardReport> {
  const registrarInner = new MockRegistrarProvider();
  const dnsInner = new MockDnsProvider();
  const hostingInner = new MockHostingProvider();
  const paymentsInner = new MockPaymentProvider();
  const registrarWrites = { count: 0 };
  const dnsWrites = { count: 0 };
  const hostingWrites = { count: 0 };
  const paymentWrites = { count: 0 };

  const originalRegister = registrarInner.registerDomain.bind(registrarInner);
  registrarInner.registerDomain = async (input) => {
    registrarWrites.count += 1;
    return originalRegister(input);
  };
  const originalDnsCreate = dnsInner.createRecord.bind(dnsInner);
  dnsInner.createRecord = async (zone, record) => {
    dnsWrites.count += 1;
    return originalDnsCreate(zone, record);
  };
  const originalDnsUpdate = dnsInner.updateRecord.bind(dnsInner);
  dnsInner.updateRecord = async (zone, record) => {
    dnsWrites.count += 1;
    return originalDnsUpdate(zone, record);
  };
  const originalDnsDelete = dnsInner.deleteRecord.bind(dnsInner);
  dnsInner.deleteRecord = async (zone, record) => {
    dnsWrites.count += 1;
    return originalDnsDelete(zone, record);
  };
  const originalDeploy = hostingInner.deploy.bind(hostingInner);
  hostingInner.deploy = async (input) => {
    hostingWrites.count += 1;
    return originalDeploy(input);
  };
  const originalAttach = hostingInner.attachDomain.bind(hostingInner);
  hostingInner.attachDomain = async (input) => {
    hostingWrites.count += 1;
    return originalAttach(input);
  };
  const originalProduct = paymentsInner.createProduct.bind(paymentsInner);
  paymentsInner.createProduct = async (input) => {
    paymentWrites.count += 1;
    return originalProduct(input);
  };
  const originalPrice = paymentsInner.createPrice.bind(paymentsInner);
  paymentsInner.createPrice = async (input) => {
    paymentWrites.count += 1;
    return originalPrice(input);
  };
  const originalCheckout = paymentsInner.createCheckoutConfiguration.bind(paymentsInner);
  paymentsInner.createCheckoutConfiguration = async (input) => {
    paymentWrites.count += 1;
    return originalCheckout(input);
  };

  const registrar = wrapRegistrarReadOnly(registrarInner, registrarWrites);
  const dns = wrapDnsReadOnly(dnsInner, dnsWrites);
  const hosting = wrapHostingReadOnly(hostingInner, hostingWrites);
  const payments = wrapPaymentsReadOnly(paymentsInner, paymentWrites);

  let domainRegisterBlocked = false;
  let domainRegisterCode: string | null = null;
  try {
    await registrar.registerDomain({
      domain: "blocked-probe.example",
      authorizationRef: "should-not-matter",
      idempotencyKey: "read-only-register",
    });
  } catch (error) {
    domainRegisterBlocked = error instanceof ReadOnlyMutationBlockedError;
    domainRegisterCode = error instanceof Error ? error.message.split(":")[0]! : null;
  }

  let dnsMutationBlocked = false;
  let dnsMutationCode: string | null = null;
  try {
    await dns.createRecord("zone.example", { recordType: "A", name: "@", value: "192.0.2.1", ttl: 300 });
  } catch (error) {
    dnsMutationBlocked = error instanceof ReadOnlyMutationBlockedError;
    dnsMutationCode = error instanceof Error ? error.message.split(":")[0]! : null;
  }
  try {
    await dns.updateRecord("zone.example", { recordType: "A", name: "@", value: "192.0.2.1", ttl: 300 });
  } catch (error) {
    dnsMutationBlocked = dnsMutationBlocked && error instanceof ReadOnlyMutationBlockedError;
  }
  try {
    await dns.deleteRecord("zone.example", { recordType: "A", name: "@", value: "192.0.2.1", ttl: 300 });
  } catch (error) {
    dnsMutationBlocked = dnsMutationBlocked && error instanceof ReadOnlyMutationBlockedError;
  }

  const { NamecheapReadAdapter } = await import("../providers/namecheap/read-adapter");
  const { CloudflareReadAdapter } = await import("../providers/cloudflare/read-adapter");
  const namecheap = new NamecheapReadAdapter({ env: {} });
  const cloudflare = new CloudflareReadAdapter({ env: {} });
  try {
    namecheap.denyWrite("namecheap.domains.create");
  } catch (error) {
    domainRegisterBlocked = domainRegisterBlocked && error instanceof ReadOnlyMutationBlockedError;
  }
  try {
    cloudflare.denyWrite("dns_record.create");
  } catch (error) {
    dnsMutationBlocked = dnsMutationBlocked && error instanceof ReadOnlyMutationBlockedError;
  }

  let hostingDeployBlocked = false;
  let hostingMutationCode: string | null = null;
  try {
    await hosting.deploy({ projectId: "proj-guard", artifactRef: "a1", idempotencyKey: "guard:deploy" });
  } catch (error) {
    hostingDeployBlocked = error instanceof ReadOnlyMutationBlockedError;
    hostingMutationCode = error instanceof Error ? error.message.split(":")[0]! : null;
  }
  try {
    await hosting.attachDomain({ projectId: "proj-guard", domain: "blocked.example", idempotencyKey: "guard:attach" });
  } catch (error) {
    hostingDeployBlocked = hostingDeployBlocked && error instanceof ReadOnlyMutationBlockedError;
  }

  let paymentProductBlocked = false;
  let paymentMutationCode: string | null = null;
  try {
    await payments.createProduct({ name: "Blocked", description: null, metadata: {} });
  } catch (error) {
    paymentProductBlocked = error instanceof ReadOnlyMutationBlockedError;
    paymentMutationCode = error instanceof Error ? error.message.split(":")[0]! : null;
  }
  try {
    await payments.createPrice({
      productId: "p1",
      amountUsd: 9,
      currency: "USD",
      interval: null,
      pricingType: "one_time",
      metadata: {},
    });
  } catch (error) {
    paymentProductBlocked = paymentProductBlocked && error instanceof ReadOnlyMutationBlockedError;
  }
  try {
    await payments.createCheckoutConfiguration({
      priceId: "price_1",
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/no",
      metadata: {},
    });
  } catch (error) {
    paymentProductBlocked = paymentProductBlocked && error instanceof ReadOnlyMutationBlockedError;
  }

  let treasuryBypassBlocked = false;
  const store = new CommercializationStore();
  ensureVentureBudget(store, { organizationId: "org-guard", ventureId: "venture-guard", authorizedBudgetUsd: 0 });
  const req = createDomainRequirement({
    store,
    organizationId: "org-guard",
    ventureId: "venture-guard",
    brandName: "Guard",
  });
  const candidate: DomainCandidate = {
    id: "cand-guard",
    organizationId: req.organizationId,
    domainRequirementId: req.id,
    domain: "blocked-probe.example",
    tld: ".example",
    available: true,
    registrationPriceUsd: 12.99,
    renewalPriceUsd: 14.99,
    priceTruth: "ESTIMATE",
    totalScore: 1,
    scoreBreakdown: {
      brandFit: 1,
      memorability: 1,
      spellingClarity: 1,
      length: 1,
      customerRelevance: 1,
      tldQuality: 1,
      businessRelevance: 1,
      price: 1,
      renewalCost: 1,
      confusionRisk: 1,
      trademarkRiskSignal: 1,
    },
    selected: true,
  };
  try {
    await registerDomainWithAuthority({
      store,
      registrar: registrarInner,
      organizationId: "org-guard",
      ventureId: "venture-guard",
      candidate,
    });
  } catch {
    treasuryBypassBlocked = true;
  }

  try {
    assertGatewayBackedExecution({ authorizationRef: null });
  } catch {
    /* expected EAG block */
  }

  return {
    domainRegisterBlocked,
    domainRegisterCalls: registrarWrites.count,
    domainRegisterCode,
    dnsMutationBlocked,
    dnsCreateCalls: dnsWrites.count,
    dnsMutationCode,
    hostingDeployBlocked,
    hostingDeployCalls: hostingWrites.count,
    hostingMutationCode,
    paymentProductBlocked,
    paymentProductCalls: paymentWrites.count,
    paymentMutationCode,
    treasuryBypassBlocked,
  };
}
