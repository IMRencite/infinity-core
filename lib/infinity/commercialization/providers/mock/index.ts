import { randomUUID } from "node:crypto";
import type {
  DnsCapability,
  DnsRecord,
  DomainRegistrationResult,
  DomainSearchResult,
  HostingCapability,
  HostingDeployResult,
  PaymentCapability,
  PaymentPriceResult,
  PaymentProductResult,
  CheckoutSessionResult,
  ProviderPaymentEvent,
  RegistrarCapability,
} from "../contracts";
import type { FinancialTruth } from "../../types";
import { normalizeDomainSearchResult } from "../normalize-search";
import { normalizeUsdAmount } from "../money";

type MockRegistrarState = {
  purchases: Map<string, DomainRegistrationResult>;
  availability: Map<string, DomainSearchResult>;
};

type MockDnsState = {
  zones: Map<string, DnsRecord[]>;
};

type MockHostingState = {
  projects: Map<string, { deployments: Map<string, HostingDeployResult>; domains: Set<string> }>;
};

type MockPaymentState = {
  products: Map<string, PaymentProductResult>;
  prices: Map<string, PaymentPriceResult>;
  checkouts: Map<string, CheckoutSessionResult>;
  events: Map<string, ProviderPaymentEvent>;
  webhookSecret: string;
};

export class MockRegistrarProvider implements RegistrarCapability {
  readonly providerKey = "mock.registrar_v1";
  private state: MockRegistrarState;

  constructor(state?: MockRegistrarState) {
    this.state = state ?? { purchases: new Map(), availability: new Map() };
  }

  seedAvailability(results: DomainSearchResult[]): void {
    for (const r of results) this.state.availability.set(r.domain, r);
  }

  get purchaseCount(): number {
    return this.state.purchases.size;
  }

  async searchDomains(queries: string[]): Promise<DomainSearchResult[]> {
    return Promise.all(queries.map((q) => this.getAvailability(q)));
  }

  async getAvailability(domain: string): Promise<DomainSearchResult> {
    const seeded = this.state.availability.get(domain);
    if (seeded) return normalizeDomainSearchResult(seeded);
    return normalizeDomainSearchResult({
      domain,
      available: !domain.includes("taken"),
      registrationPriceUsd: 12.99,
      renewalPriceUsd: 14.99,
      priceTruth: "ESTIMATE",
      currency: "USD",
      premium: false,
    });
  }

  async getRegistrationPrice(domain: string): Promise<{ priceUsd: number | null; truth: FinancialTruth }> {
    const avail = await this.getAvailability(domain);
    return { priceUsd: avail.registrationPriceUsd, truth: avail.priceTruth };
  }

  async getRenewalPrice(domain: string): Promise<{ priceUsd: number | null; truth: FinancialTruth }> {
    const avail = await this.getAvailability(domain);
    return { priceUsd: avail.renewalPriceUsd, truth: avail.priceTruth };
  }

  async registerDomain(input: {
    domain: string;
    authorizationRef: string;
    idempotencyKey: string;
  }): Promise<DomainRegistrationResult> {
    if (!input.authorizationRef) {
      throw new Error("AUTHORIZATION_MISSING");
    }
    const existing = this.state.purchases.get(input.idempotencyKey);
    if (existing) return existing;

    const avail = await this.getAvailability(input.domain);
    if (!avail.available) throw new Error("DOMAIN_UNAVAILABLE");

    const result: DomainRegistrationResult = {
      registrarDomainId: `mock-reg-${randomUUID()}`,
      domain: input.domain,
      registrationPriceUsd: normalizeUsdAmount(avail.registrationPriceUsd),
      renewalPriceUsd: normalizeUsdAmount(avail.renewalPriceUsd),
      renewalPriceTruth: avail.renewalPriceUsd == null ? "UNKNOWN" : avail.priceTruth,
      currency: avail.currency,
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    };
    this.state.purchases.set(input.idempotencyKey, result);
    return result;
  }

  async configureNameservers(domain: string, nameservers: string[]): Promise<{ configured: boolean }> {
    return { configured: nameservers.length > 0 && domain.length > 0 };
  }
}

export class MockDnsProvider implements DnsCapability {
  readonly providerKey = "mock.dns_v1";
  private state: MockDnsState;

  constructor(state?: MockDnsState) {
    this.state = state ?? { zones: new Map() };
  }

  async createZone(zoneName: string): Promise<{ zoneId: string }> {
    if (!this.state.zones.has(zoneName)) this.state.zones.set(zoneName, []);
    return { zoneId: `zone-${zoneName}` };
  }

  async getZone(zoneName: string): Promise<{ zoneId: string; exists: boolean }> {
    return { zoneId: `zone-${zoneName}`, exists: this.state.zones.has(zoneName) };
  }

  async listRecords(zoneName: string): Promise<DnsRecord[]> {
    return [...(this.state.zones.get(zoneName) ?? [])];
  }

  async createRecord(zoneName: string, record: DnsRecord): Promise<{ recordId: string }> {
    const zone = this.state.zones.get(zoneName) ?? [];
    const key = `${record.recordType}:${record.name}:${record.value}`;
    if (zone.some((r) => `${r.recordType}:${r.name}:${r.value}` === key)) {
      return { recordId: key };
    }
    zone.push(record);
    this.state.zones.set(zoneName, zone);
    return { recordId: key };
  }

  async updateRecord(zoneName: string, record: DnsRecord): Promise<{ updated: boolean }> {
    const zone = this.state.zones.get(zoneName) ?? [];
    const idx = zone.findIndex((r) => r.name === record.name && r.recordType === record.recordType);
    if (idx >= 0) {
      zone[idx] = record;
      return { updated: true };
    }
    return { updated: false };
  }

  async deleteRecord(zoneName: string, record: DnsRecord): Promise<{ deleted: boolean }> {
    const zone = this.state.zones.get(zoneName) ?? [];
    const next = zone.filter((r) => !(r.name === record.name && r.recordType === record.recordType && r.value === record.value));
    this.state.zones.set(zoneName, next);
    return { deleted: next.length < zone.length };
  }

  async verifyRecord(zoneName: string, record: DnsRecord): Promise<{ verified: boolean; details: string[] }> {
    const zone = this.state.zones.get(zoneName) ?? [];
    const found = zone.some((r) => r.name === record.name && r.recordType === record.recordType && r.value === record.value);
    return { verified: found, details: found ? ["record present"] : ["record missing"] };
  }
}

export class MockHostingProvider implements HostingCapability {
  readonly providerKey = "mock.hosting_v1";
  private state: MockHostingState;
  private failDeploy = false;

  constructor(state?: MockHostingState) {
    this.state = state ?? { projects: new Map() };
  }

  setFailDeploy(fail: boolean): void {
    this.failDeploy = fail;
  }

  async createProject(name: string): Promise<{ projectId: string }> {
    const projectId = `proj-${name}`;
    if (!this.state.projects.has(projectId)) {
      this.state.projects.set(projectId, { deployments: new Map(), domains: new Set() });
    }
    return { projectId };
  }

  async configureProject(projectId: string): Promise<{ configured: boolean }> {
    return { configured: this.state.projects.has(projectId) };
  }

  async deploy(input: { projectId: string; artifactRef: string; idempotencyKey: string }): Promise<HostingDeployResult> {
    if (this.failDeploy) throw new Error("DEPLOYMENT_FAILED");
    const project = this.state.projects.get(input.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const existing = project.deployments.get(input.idempotencyKey);
    if (existing) return existing;
    const result: HostingDeployResult = {
      projectId: input.projectId,
      deploymentId: `dep-${input.idempotencyKey}`,
      deploymentUrl: `https://${input.projectId}.mock.host`,
      status: "READY",
    };
    project.deployments.set(input.idempotencyKey, result);
    return result;
  }

  async attachDomain(input: { projectId: string; domain: string; idempotencyKey: string }): Promise<{ attached: boolean }> {
    const project = this.state.projects.get(input.projectId);
    if (!project) return { attached: false };
    project.domains.add(input.domain);
    return { attached: true };
  }

  async verifyDomain(projectId: string, domain: string): Promise<{ verified: boolean; httpsValid: boolean }> {
    const project = this.state.projects.get(projectId);
    return { verified: Boolean(project?.domains.has(domain)), httpsValid: Boolean(project?.domains.has(domain)) };
  }

  async getDeployment(projectId: string, deploymentId: string): Promise<{ healthy: boolean; url: string | null }> {
    const project = this.state.projects.get(projectId);
    const dep = project ? [...project.deployments.values()].find((d) => d.deploymentId === deploymentId) : null;
    return { healthy: Boolean(dep), url: dep?.deploymentUrl ?? null };
  }

  async rollback(): Promise<{ rolledBack: boolean }> {
    return { rolledBack: true };
  }
}

export class MockPaymentProvider implements PaymentCapability {
  readonly providerKey = "mock.payments_v1";
  private state: MockPaymentState;

  constructor(state?: Partial<MockPaymentState>) {
    this.state = {
      products: new Map(),
      prices: new Map(),
      checkouts: new Map(),
      events: new Map(),
      webhookSecret: state?.webhookSecret ?? "whsec_mock_test_secret",
      ...state,
    } as MockPaymentState;
  }

  get webhookSecret(): string {
    return this.state.webhookSecret;
  }

  signPayload(payload: string): string {
    return `mock_sig_${Buffer.from(payload).toString("base64url")}`;
  }

  async createProduct(input: { name: string; description: string | null; metadata: Record<string, string> }): Promise<PaymentProductResult> {
    const id = `prod_${input.metadata.ventureId ?? randomUUID()}`;
    const existing = [...this.state.products.values()].find((p) => p.name === input.name);
    if (existing) return existing;
    const result = { providerProductId: id, name: input.name };
    this.state.products.set(id, result);
    return result;
  }

  async createPrice(input: {
    productId: string;
    amountUsd: number;
    currency: string;
    interval: string | null;
    pricingType: string;
    metadata: Record<string, string>;
  }): Promise<PaymentPriceResult> {
    const id = `price_${input.metadata.commercialProductId ?? randomUUID()}`;
    const existing = this.state.prices.get(id);
    if (existing) return existing;
    const result: PaymentPriceResult = {
      providerPriceId: id,
      amountUsd: input.amountUsd,
      currency: input.currency,
      interval: input.interval,
    };
    this.state.prices.set(id, result);
    return result;
  }

  async updatePrice(): Promise<{ updated: boolean }> {
    return { updated: true };
  }

  async archivePrice(): Promise<{ archived: boolean }> {
    return { archived: true };
  }

  async createCheckoutConfiguration(input: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<CheckoutSessionResult> {
    const sessionId = `cs_${input.metadata.ventureId ?? randomUUID()}`;
    const existing = this.state.checkouts.get(sessionId);
    if (existing) return existing;
    const result = {
      checkoutUrl: `https://checkout.mock/${sessionId}`,
      sessionId,
    };
    this.state.checkouts.set(sessionId, result);
    return result;
  }

  async verifyWebhookEndpoint(secret: string, signature: string, payload: string): Promise<{ valid: boolean }> {
    if (secret !== this.state.webhookSecret) return { valid: false };
    return { valid: signature === this.signPayload(payload) };
  }

  parseWebhookEvent(payload: string): ProviderPaymentEvent {
    const parsed = JSON.parse(payload) as ProviderPaymentEvent;
    return parsed;
  }

  async getTransaction(): Promise<{ amountUsd: number | null; status: string }> {
    return { amountUsd: null, status: "unknown" };
  }

  async getSubscription(): Promise<{ status: string; customerId: string | null }> {
    return { status: "active", customerId: "cus_mock" };
  }
}

export type MockProviderBundle = {
  registrar: MockRegistrarProvider;
  dns: MockDnsProvider;
  hosting: MockHostingProvider;
  payments: MockPaymentProvider;
};

export function createMockProviderBundle(): MockProviderBundle {
  return {
    registrar: new MockRegistrarProvider(),
    dns: new MockDnsProvider(),
    hosting: new MockHostingProvider(),
    payments: new MockPaymentProvider(),
  };
}
