import type { FinancialTruth } from "../types";
import {
  CLOUDFLARE_API_TOKEN_ENV,
  CLOUDFLARE_PROBE_ZONE_ENV,
  CLOUDFLARE_ZONE_ID_ENV,
  NAMECHEAP_API_KEY_ENV,
  NAMECHEAP_API_USER_ENV,
  NAMECHEAP_CLIENT_IP_ENV,
  STRIPE_SECRET_KEY_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_TOKEN_ENV,
} from "../providers/config";
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

async function namecheapFetch(params: Record<string, string>): Promise<string> {
  const user = process.env[NAMECHEAP_API_USER_ENV];
  const key = process.env[NAMECHEAP_API_KEY_ENV];
  const clientIp = process.env[NAMECHEAP_CLIENT_IP_ENV];
  if (!user || !key || !clientIp) throw new Error("NAMECHEAP_CREDENTIALS_MISSING");

  const query = new URLSearchParams({
    ApiUser: user,
    ApiKey: key,
    UserName: user,
    ClientIp: clientIp,
    ...params,
  });

  const res = await fetch(`https://api.namecheap.com/xml.response?${query.toString()}`);
  if (!res.ok) throw new Error(`NAMECHEAP_HTTP_${res.status}`);
  return res.text();
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

export async function probeRegistrarLive(domains: string[]): Promise<{
  provider: string;
  rows: RegistrarProbeRow[];
  mutationOccurred: false;
  normalization: "PASS" | "FAIL" | "SKIPPED";
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
}> {
  const inventory = buildProviderInventory();
  if (inventory.registrar.configured !== "CONFIGURED") {
    return {
      provider: inventory.registrar.providerKey,
      rows: [],
      mutationOccurred: false,
      normalization: "SKIPPED",
      status: "NOT_CONFIGURED",
      realProviderCall: false,
      failureCode: "NOT_CONFIGURED",
    };
  }

  const rows: RegistrarProbeRow[] = [];
  try {
    for (const domain of domains) {
      const xml = await namecheapFetch({
        Command: "namecheap.domains.check",
        DomainList: domain,
      });
      const parsed = parseNamecheapAvailability(xml, domain);
      rows.push({
        ...parsed,
        provider: "namecheap.com_v1",
        normalized: parsed.renewalPriceUsd === null || typeof parsed.renewalPriceUsd === "number",
        checkedAt: new Date().toISOString(),
        source: "LIVE",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureCode: ProviderProbeFailureCode = /HTTP_401|HTTP_403|AUTH/i.test(message)
      ? "AUTH_FAILED"
      : /ECONN|ETIMEDOUT|network/i.test(message)
        ? "NETWORK_ERROR"
        : "PROVIDER_ERROR";
    return {
      provider: "namecheap.com_v1",
      rows,
      mutationOccurred: false,
      normalization: "FAIL",
      status: "FAILED",
      realProviderCall: rows.length > 0,
      failureCode,
    };
  }

  const priceUnsupported = rows.some((r) => r.available != null && r.registrationPriceUsd == null);
  return {
    provider: "namecheap.com_v1",
    rows,
    mutationOccurred: false,
    normalization: rows.length > 0 && rows.every((r) => r.renewalPriceUsd === null || typeof r.renewalPriceUsd === "number") ? "PASS" : "FAIL",
    status: priceUnsupported ? "DEGRADED" : rows.length > 0 ? "READ_ONLY_VERIFIED" : "FAILED",
    realProviderCall: true,
    failureCode: null,
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
  normalization: "PASS" | "FAIL" | "SKIPPED";
  mutationOccurred: false;
  status: ProviderCapabilityStatus;
  realProviderCall: boolean;
  failureCode: ProviderProbeFailureCode | null;
}> {
  const skipped = {
    provider: "cloudflare.dns_v1",
    zoneReadable: false,
    recordsReadable: false,
    zonesReadable: false,
    zoneCount: null as number | null,
    selectedZone: null as string | null,
    recordCount: null as number | null,
    normalization: "SKIPPED" as const,
    mutationOccurred: false as const,
    status: "NOT_CONFIGURED" as const,
    realProviderCall: false,
    failureCode: "NOT_CONFIGURED" as const,
  };
  const inventory = buildProviderInventory();
  if (inventory.dns.configured !== "CONFIGURED") return skipped;

  const token = process.env[CLOUDFLARE_API_TOKEN_ENV]!;
  const headers = { Authorization: `Bearer ${token}` };
  const configuredZoneId = process.env[CLOUDFLARE_ZONE_ID_ENV]?.trim() || null;
  const zoneName = process.env[CLOUDFLARE_PROBE_ZONE_ENV]?.trim() || null;

  const zonesRes = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=5", { headers });
  if (!zonesRes.ok) {
    return {
      ...skipped,
      normalization: "FAIL",
      status: zonesRes.status === 401 || zonesRes.status === 403 ? "FAILED" : "UNAVAILABLE",
      realProviderCall: true,
      failureCode: classifyHttpFailure(zonesRes.status),
    };
  }
  const zonesBody = (await zonesRes.json()) as { result?: Array<{ id: string; name: string }> };
  const zones = zonesBody.result ?? [];
  const zoneCount = zones.length;
  let resolvedZoneId = configuredZoneId;
  if (!resolvedZoneId && zoneName) {
    resolvedZoneId = zones.find((z) => z.name === zoneName)?.id ?? null;
  }
  if (!resolvedZoneId) resolvedZoneId = zones[0]?.id ?? null;
  const selectedZone = zones.find((z) => z.id === resolvedZoneId)?.name ?? zoneName ?? resolvedZoneId;

  if (!resolvedZoneId) {
    return {
      provider: "cloudflare.dns_v1",
      zoneReadable: true,
      recordsReadable: true,
      zonesReadable: true,
      zoneCount: 0,
      selectedZone: null,
      recordCount: 0,
      normalization: "PASS",
      mutationOccurred: false,
      status: "READ_ONLY_VERIFIED",
      realProviderCall: true,
      failureCode: null,
    };
  }

  const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${resolvedZoneId}`, { headers });
  const recordsRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${resolvedZoneId}/dns_records?per_page=5`,
    { headers },
  );
  let recordCount: number | null = null;
  if (recordsRes.ok) {
    const body = (await recordsRes.json()) as { result?: unknown[] };
    recordCount = body.result?.length ?? 0;
  }

  const ok = zoneRes.ok && recordsRes.ok;
  return {
    provider: "cloudflare.dns_v1",
    zoneReadable: zoneRes.ok,
    recordsReadable: recordsRes.ok,
    zonesReadable: true,
    zoneCount,
    selectedZone,
    recordCount,
    normalization: ok ? "PASS" : "FAIL",
    mutationOccurred: false,
    status: ok ? "READ_ONLY_VERIFIED" : "DEGRADED",
    realProviderCall: true,
    failureCode: ok ? null : classifyHttpFailure(recordsRes.ok ? zoneRes.status : recordsRes.status),
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

export async function probePaymentsLive(): Promise<{
  provider: string;
  accountAccessible: boolean;
  mode: ProviderEnvironment;
  productsCapability: boolean;
  pricesCapability: boolean;
  checkoutCapability: boolean;
  subscriptionsCapability: boolean;
  webhooksCapability: boolean;
  chargesCapability: boolean | null;
  payoutsCapability: boolean | null;
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
    accountAccessible: false,
    mode: inventory.payments.environment,
    productsCapability: false,
    pricesCapability: false,
    checkoutCapability: false,
    subscriptionsCapability: false,
    webhooksCapability: false,
    chargesCapability: null as boolean | null,
    payoutsCapability: null as boolean | null,
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
  const accountRes = await fetch("https://api.stripe.com/v1/account", { headers });
  if (!accountRes.ok) {
    return {
      ...base,
      mode: inventory.payments.environment,
      normalization: "FAIL",
      status: "FAILED",
      realProviderCall: true,
      failureCode: classifyHttpFailure(accountRes.status),
    };
  }
  const account = (await accountRes.json()) as {
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  };

  const [productsRes, pricesRes, webhooksRes] = await Promise.all([
    fetch("https://api.stripe.com/v1/products?limit=5", { headers }),
    fetch("https://api.stripe.com/v1/prices?limit=5", { headers }),
    fetch("https://api.stripe.com/v1/webhook_endpoints?limit=1", { headers }),
  ]);

  let productCount: number | null = null;
  let priceCount: number | null = null;
  if (productsRes.ok) {
    const body = (await productsRes.json()) as { data?: unknown[] };
    productCount = body.data?.length ?? 0;
  }
  if (pricesRes.ok) {
    const body = (await pricesRes.json()) as { data?: unknown[] };
    priceCount = body.data?.length ?? 0;
  }

  return {
    provider: "stripe.com_v1",
    accountAccessible: true,
    mode: inventory.payments.environment,
    productsCapability: productsRes.ok,
    pricesCapability: pricesRes.ok,
    checkoutCapability: false,
    subscriptionsCapability: false,
    webhooksCapability: webhooksRes.ok,
    chargesCapability: account.charges_enabled ?? null,
    payoutsCapability: account.payouts_enabled ?? null,
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
