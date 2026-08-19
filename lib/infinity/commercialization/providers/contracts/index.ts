import type { FinancialTruth } from "../../types";

export type DomainSearchResult = {
  domain: string;
  available: boolean;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  priceTruth: FinancialTruth;
  currency: string;
};

export type DomainRegistrationResult = {
  registrarDomainId: string;
  domain: string;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  renewalPriceTruth: FinancialTruth;
  currency: string;
  registeredAt: string;
  expiresAt: string;
};

/** Provider-neutral registrar capability contract */
export interface RegistrarCapability {
  readonly providerKey: string;
  searchDomains(queries: string[]): Promise<DomainSearchResult[]>;
  getAvailability(domain: string): Promise<DomainSearchResult>;
  getRegistrationPrice(domain: string): Promise<{ priceUsd: number | null; truth: FinancialTruth }>;
  getRenewalPrice(domain: string): Promise<{ priceUsd: number | null; truth: FinancialTruth }>;
  registerDomain(input: {
    domain: string;
    authorizationRef: string;
    idempotencyKey: string;
  }): Promise<DomainRegistrationResult>;
  configureNameservers(domain: string, nameservers: string[]): Promise<{ configured: boolean }>;
}

export type DnsRecord = {
  recordType: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "CAA";
  name: string;
  value: string;
  ttl: number;
};

/** Provider-neutral DNS capability contract */
export interface DnsCapability {
  readonly providerKey: string;
  createZone(zoneName: string): Promise<{ zoneId: string }>;
  getZone(zoneName: string): Promise<{ zoneId: string; exists: boolean }>;
  listRecords(zoneName: string): Promise<DnsRecord[]>;
  createRecord(zoneName: string, record: DnsRecord): Promise<{ recordId: string }>;
  updateRecord(zoneName: string, record: DnsRecord): Promise<{ updated: boolean }>;
  deleteRecord(zoneName: string, record: DnsRecord): Promise<{ deleted: boolean }>;
  verifyRecord(zoneName: string, record: DnsRecord): Promise<{ verified: boolean; details: string[] }>;
}

export type HostingDeployResult = {
  projectId: string;
  deploymentId: string;
  deploymentUrl: string;
  status: string;
};

/** Provider-neutral hosting/deployment capability contract */
export interface HostingCapability {
  readonly providerKey: string;
  createProject(name: string): Promise<{ projectId: string }>;
  configureProject(projectId: string, config: Record<string, unknown>): Promise<{ configured: boolean }>;
  deploy(input: { projectId: string; artifactRef: string; idempotencyKey: string }): Promise<HostingDeployResult>;
  attachDomain(input: { projectId: string; domain: string; idempotencyKey: string }): Promise<{ attached: boolean }>;
  verifyDomain(projectId: string, domain: string): Promise<{ verified: boolean; httpsValid: boolean }>;
  getDeployment(projectId: string, deploymentId: string): Promise<{ healthy: boolean; url: string | null }>;
  rollback(projectId: string, deploymentId: string): Promise<{ rolledBack: boolean }>;
}

export type PaymentProductResult = {
  providerProductId: string;
  name: string;
};

export type PaymentPriceResult = {
  providerPriceId: string;
  amountUsd: number;
  currency: string;
  interval: string | null;
};

export type CheckoutSessionResult = {
  checkoutUrl: string;
  sessionId: string;
};

export type ProviderPaymentEvent = {
  providerEventId: string;
  eventType: string;
  amountUsd: number | null;
  feeUsd: number | null;
  currency: string;
  customerReference: string | null;
  metadata: Record<string, string>;
  rawPayload: Record<string, unknown>;
};

/** Provider-neutral payment capability contract */
export interface PaymentCapability {
  readonly providerKey: string;
  createProduct(input: { name: string; description: string | null; metadata: Record<string, string> }): Promise<PaymentProductResult>;
  createPrice(input: {
    productId: string;
    amountUsd: number;
    currency: string;
    interval: string | null;
    pricingType: string;
    metadata: Record<string, string>;
  }): Promise<PaymentPriceResult>;
  updatePrice(priceId: string, input: { active: boolean }): Promise<{ updated: boolean }>;
  archivePrice(priceId: string): Promise<{ archived: boolean }>;
  createCheckoutConfiguration(input: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<CheckoutSessionResult>;
  verifyWebhookEndpoint(secret: string, signature: string, payload: string): Promise<{ valid: boolean }>;
  parseWebhookEvent(payload: string): ProviderPaymentEvent;
  getTransaction(transactionId: string): Promise<{ amountUsd: number | null; status: string }>;
  getSubscription(subscriptionId: string): Promise<{ status: string; customerId: string | null }>;
}
