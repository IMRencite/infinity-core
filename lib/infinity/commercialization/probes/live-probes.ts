import type { FinancialTruth } from "../types";
import {
  STRIPE_SECRET_KEY_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
} from "../providers/config";
import { CloudflareReadAdapter } from "../providers/cloudflare/read-adapter";
import { NamecheapReadAdapter } from "../providers/namecheap/read-adapter";
import type { DnsRecord } from "../providers/contracts";
import { normalizePremiumFlag, normalizeUsdAmount } from "../providers/money";
import type { ProviderCapabilityStatus, ProviderProbeFailureCode } from "./status";
import { classifyHttpFailure } from "./status";
import { buildProviderInventory, type ProviderEnvironment } from "./inventory";

export { buildProviderInventory } from "./inventory";
export type { ProviderConfigured, ProviderEnvironment, ProviderInventory, ProviderInventoryEntry } from "./inventory";

export type RegistrarProbeRow = {
  domain: string;
  available: boolean | null;
  registrationPriceUsd: number | null;
  renewalPriceUsd: number | null;
  currency: string;
  premium: boolean | null;
  priceTruth: FinancialTruth;
  provider: string;
  normalized: boolean;
  status: "AVAILABLE" | "UNAVAILABLE" | "PREMIUM" | "UNKNOWN";
  checkedAt: string;
  source: "LIVE";
};

export async function probeRegistrarLive(_domains: string[] = []): Promise<{
  provider: string;
  rows: RegistrarProbeRow[];
  domains: Awaited<ReturnType<NamecheapReadAdapter["verifyReadOnly"]>>["domains"];
  domainCount: number | null;
  nextExpiration: string | null;
  authRead: boolean;
  domainListRead: boolean;
  domainDetailRead: boolean;
  clientIpWhitelistRequired: true;
  readHttpCalls: number;
  writeHttpCalls: 0;
  mutationOccurred: false;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
  failureReason: string | null;
}> {
  void _domains;
  const adapter = new NamecheapReadAdapter();
  const report = await adapter.verifyReadOnly();
  return {
    provider: report.provider,
    rows: [],
    domains: report.domains,
    domainCount: report.domainCount,
    nextExpiration: report.nextExpiration,
    authRead: report.authRead,
    domainListRead: report.domainListRead,
    domainDetailRead: report.domainDetailRead,
    clientIpWhitelistRequired: true,
    readHttpCalls: report.readHttpCalls,
    writeHttpCalls: 0,
    mutationOccurred: false,
    normalization: report.normalization,
    status: report.status,
    realProviderCall: report.realProviderCall,
    failureCode: report.failureCode,
    failureReason: report.failureReason,
  };
}

export function parseNamecheapAvailability(xml: string, domain: string): Omit<RegistrarProbeRow, "provider" | "normalized" | "checkedAt" | "source"> {
  const availableMatch = xml.match(/Available="(true|false)"/i);
  const premiumMatch = xml.match(/IsPremiumName="(true|false)"/i);
  const regPriceMatch = xml.match(/PremiumRegistrationPrice="([^"]+)"/i) ?? xml.match(/Price="([^"]+)"/i);
  const renewPriceMatch = xml.match(/PremiumRenewalPrice="([^"]+)"/i) ?? xml.match(/RenewalPrice="([^"]+)"/i);

  const available = availableMatch ? availableMatch[1]!.toLowerCase() === "true" : null;
  const premium = normalizePremiumFlag(premiumMatch?.[1] ?? null);
  const registrationPriceUsd = normalizeUsdAmount(regPriceMatch?.[1] ?? null);
  const renewalPriceUsd = normalizeUsdAmount(renewPriceMatch?.[1] ?? null);

  const status: RegistrarProbeRow["status"] =
    premium === true ? "PREMIUM" : available === true ? "AVAILABLE" : available === false ? "UNAVAILABLE" : "UNKNOWN";

  return {
    domain,
    available,
    registrationPriceUsd,
    renewalPriceUsd,
    currency: "USD",
    premium,
    priceTruth: registrationPriceUsd == null && renewalPriceUsd == null ? "UNKNOWN" : "ESTIMATE",
    status,
  };
}

export async function probeDnsLive(): Promise<{
  provider: string;
  zoneReadable: boolean;
  recordsReadable: boolean;
  zonesReadable: boolean;
  zoneCount: number | null;
  selectedZone: string | null;
  recordCount: number | null;
  authRead: boolean;
  zoneListRead: boolean;
  dnsRecordRead: boolean;
  tokenScope: "TOKEN_SCOPE_MINIMAL" | "TOKEN_SCOPE_BROADER_THAN_REQUIRED" | "UNKNOWN";
  readHttpCalls: number;
  writeHttpCalls: 0;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  mutationOccurred: false;
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
  failureReason: string | null;
}> {
  const adapter = new CloudflareReadAdapter();
  const report = await adapter.verifyReadOnly();
  return {
    provider: report.provider,
    zoneReadable: report.zoneDetailRead,
    recordsReadable: report.dnsRecordRead,
    zonesReadable: report.zoneListRead,
    zoneCount: report.zoneCount,
    selectedZone: report.zones[0]?.zoneName ?? null,
    recordCount: report.recordCount,
    authRead: report.authRead,
    zoneListRead: report.zoneListRead,
    dnsRecordRead: report.dnsRecordRead,
    tokenScope: report.tokenScope,
    readHttpCalls: report.readHttpCalls,
    writeHttpCalls: 0,
    normalization: report.normalization,
    mutationOccurred: false,
    status: report.status,
    realProviderCall: report.realProviderCall,
    failureCode: report.failureCode,
    failureReason: report.failureReason,
  };
}

export async function probeHostingLive(): Promise<{
  provider: string;
  accountAccessible: boolean;
  projectsReadable: boolean;
  deploymentsReadable: boolean;
  domainCapability: boolean;
  projectCount: number | null;
  deploymentCount: number | null;
  environment: ProviderEnvironment;
  mutationOccurred: false;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
}> {
  const inventory = buildProviderInventory();
  const base = {
    provider: "vercel.com_v1",
    accountAccessible: false,
    projectsReadable: false,
    deploymentsReadable: false,
    domainCapability: false,
    projectCount: null as number | null,
    deploymentCount: null as number | null,
    environment: inventory.hosting.environment,
    mutationOccurred: false as const,
    normalization: "SKIPPED" as const,
    status: "NOT_CONFIGURED" as const,
    realProviderCall: false,
    failureCode: "NOT_CONFIGURED" as const,
  };
  if (inventory.hosting.configured !== "CONFIGURED") return base;

  const token = process.env[VERCEL_TOKEN_ENV]!;
  const teamId = process.env[VERCEL_TEAM_ID_ENV]?.trim();
  const headers = { Authorization: `Bearer ${token}` };

  const userRes = await fetch("https://api.vercel.com/v2/user", { headers });
  const accountAccessible = userRes.ok;
  if (!accountAccessible) {
    return {
      ...base,
      normalization: "FAIL",
      status: "FAILED",
      realProviderCall: true,
      failureCode: classifyHttpFailure(userRes.status),
    };
  }

  const projectsUrl = teamId
    ? `https://api.vercel.com/v9/projects?limit=5&teamId=${teamId}`
    : "https://api.vercel.com/v9/projects?limit=5";
  const projectsRes = await fetch(projectsUrl, { headers });
  const projectsReadable = projectsRes.ok;
  let projectCount: number | null = null;
  let deploymentCount: number | null = null;
  let deploymentsReadable = false;
  let domainCapability = false;
  if (projectsReadable) {
    const body = (await projectsRes.json()) as { projects?: Array<{ id: string }> };
    const projects = body.projects ?? [];
    projectCount = projects.length;
    const projectId = projects[0]?.id;
    if (projectId) {
      const depUrl = teamId
        ? `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5&teamId=${teamId}`
        : `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`;
      const depRes = await fetch(depUrl, { headers });
      deploymentsReadable = depRes.ok;
      if (depRes.ok) {
        const depBody = (await depRes.json()) as { deployments?: unknown[] };
        deploymentCount = depBody.deployments?.length ?? 0;
      }
      const domainsUrl = teamId
        ? `https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects/${projectId}/domains`;
      const domainsRes = await fetch(domainsUrl, { headers });
      domainCapability = domainsRes.ok;
    } else {
      deploymentsReadable = true;
      deploymentCount = 0;
      domainCapability = true;
    }
  }

  const ok = accountAccessible && projectsReadable;
  return {
    provider: "vercel.com_v1",
    accountAccessible,
    projectsReadable,
    deploymentsReadable,
    domainCapability,
    projectCount,
    deploymentCount,
    environment: inventory.hosting.environment,
    mutationOccurred: false,
    normalization: ok ? "PASS" : "FAIL",
    status: ok ? "READ_ONLY_VERIFIED" : "DEGRADED",
    realProviderCall: true,
    failureCode: ok ? null : classifyHttpFailure(projectsRes.status),
  };
}

async function discardStripeResponseBody(res: Response): Promise<void> {
  try {
    await res.arrayBuffer();
  } catch {
    /* body already consumed or empty */
  }
}

export async function probePaymentsLive(): Promise<{
  provider: string;
  balanceAccessible: boolean;
  mode: ProviderEnvironment;
  productsCapability: boolean;
  pricesCapability: boolean;
  checkoutCapability: boolean;
  subscriptionsCapability: boolean;
  webhooksCapability: boolean;
  productCount: number | null;
  priceCount: number | null;
  liveChargesAuthorized: false;
  mutationOccurred: false;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
}> {
  const inventory = buildProviderInventory();
  const base = {
    provider: "stripe.com_v1",
    balanceAccessible: false,
    mode: inventory.payments.environment,
    productsCapability: false,
    pricesCapability: false,
    checkoutCapability: false,
    subscriptionsCapability: false,
    webhooksCapability: false,
    productCount: null as number | null,
    priceCount: null as number | null,
    liveChargesAuthorized: false as const,
    mutationOccurred: false as const,
    normalization: "SKIPPED" as const,
    status: "NOT_CONFIGURED" as const,
    realProviderCall: false,
    failureCode: "NOT_CONFIGURED" as const,
  };
  if (inventory.payments.configured !== "CONFIGURED") return base;

  const key = process.env[STRIPE_SECRET_KEY_ENV]!;
  const headers = { Authorization: `Bearer ${key}` };
  const balanceRes = await fetch("https://api.stripe.com/v1/balance", { method: "GET", headers });
  if (!balanceRes.ok) {
    await discardStripeResponseBody(balanceRes);
    return {
      ...base,
      mode: inventory.payments.environment,
      normalization: "FAIL",
      status: "FAILED",
      realProviderCall: true,
      failureCode: classifyHttpFailure(balanceRes.status),
    };
  }
  await discardStripeResponseBody(balanceRes);

  const [productsRes, pricesRes, webhooksRes] = await Promise.all([
    fetch("https://api.stripe.com/v1/products?limit=5", { method: "GET", headers }),
    fetch("https://api.stripe.com/v1/prices?limit=5", { method: "GET", headers }),
    fetch("https://api.stripe.com/v1/webhook_endpoints?limit=1", { method: "GET", headers }),
  ]);

  let productCount: number | null = null;
  let priceCount: number | null = null;
  if (productsRes.ok) {
    const body = (await productsRes.json()) as { data?: unknown[] };
    productCount = body.data?.length ?? 0;
  } else {
    await discardStripeResponseBody(productsRes);
  }
  if (pricesRes.ok) {
    const body = (await pricesRes.json()) as { data?: unknown[] };
    priceCount = body.data?.length ?? 0;
  } else {
    await discardStripeResponseBody(pricesRes);
  }
  await discardStripeResponseBody(webhooksRes);

  return {
    provider: "stripe.com_v1",
    balanceAccessible: true,
    mode: inventory.payments.environment,
    productsCapability: productsRes.ok,
    pricesCapability: pricesRes.ok,
    checkoutCapability: false,
    subscriptionsCapability: false,
    webhooksCapability: webhooksRes.ok,
    productCount,
    priceCount,
    liveChargesAuthorized: false,
    mutationOccurred: false,
    normalization: "PASS",
    status: "READ_ONLY_VERIFIED",
    realProviderCall: true,
    failureCode: null,
  };
}

export function generateProbeDomainNames(seed: string): string[] {
  const slug = seed.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const stamp = Date.now().toString(36).slice(-6);
  return [
    `infinity-probe-${slug}-${stamp}.com`,
    `infinity-probe-${slug}-${stamp}.io`,
    `infinity-probe-unavail-${stamp}.com`,
  ];
}

export function normalizeCloudflareRecord(input: {
  type: string;
  name: string;
  content: string;
  ttl: number;
}): DnsRecord | null {
  const allowed = new Set(["A", "AAAA", "CNAME", "TXT", "MX", "CAA"]);
  if (!allowed.has(input.type)) return null;
  return {
    recordType: input.type as DnsRecord["recordType"],
    name: input.name,
    value: input.content,
    ttl: input.ttl,
  };
}
