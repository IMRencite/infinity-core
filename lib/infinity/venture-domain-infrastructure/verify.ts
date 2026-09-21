import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resolver } from "node:dns/promises";
import {
  evaluateAuthoritativeDNSGate,
  evaluateCloudflareZoneTruthGate,
  evaluateDomainRegistrationTruthGate,
  evaluateInfinityDomainTopologyGate,
} from "./gates";
import type {
  DnsInventoryRow,
  DomainProviderKind,
  EmailDnsSafety,
  ImrosDomainVerification,
  VentureDomainRecord,
} from "./types";

export const IMROS_DOMAIN = "imros.io" as const;
export const IMROS_PUBLIC_ORIGIN = "https://imros.io" as const;
export const IMROS_HQ_HOST = "hq.imros.io" as const;
export const INFINITY_RUNTIME_HOST = "infinity-runtime.vercel.app" as const;

type RdapEntity = {
  roles?: string[];
  vcardArray?: [string, Array<[string, Record<string, unknown>, string, string]>];
  publicIds?: Array<{ type?: string; identifier?: string }>;
};

type RdapPayload = {
  ldhName?: string;
  status?: string[];
  secureDNS?: { delegationSigned?: boolean };
  nameservers?: Array<{ ldhName?: string }>;
  events?: Array<{ eventAction?: string; eventDate?: string }>;
  entities?: RdapEntity[];
};

export function domainRegistryPath(cwd = process.cwd()): string {
  return join(cwd, ".infinity", "venture-domain-infrastructure", "imros-io.json");
}

export function persistVentureDomainRegistry(verification: ImrosDomainVerification, cwd = process.cwd()): string {
  const path = domainRegistryPath(cwd);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(verification, null, 2));
  return path;
}

export function classifyDnsProvider(nameservers: string[]): DomainProviderKind {
  if (!nameservers.length) return "UNKNOWN";
  if (nameservers.every((ns) => /\.ns\.cloudflare\.com$/i.test(ns))) return "CLOUDFLARE";
  return "OTHER";
}

export function classifyRegistrar(name: string): DomainProviderKind {
  if (!name || name === "UNKNOWN") return "UNKNOWN";
  if (/cloudflare/i.test(name)) return "CLOUDFLARE";
  return "OTHER";
}

export function redactDnsTarget(type: string, value: string): string {
  if (type === "TXT" && /v=spf1|v=DKIM1|v=DMARC1|google-site-verification|vercel/i.test(value)) {
    return value.length > 80 ? `${value.slice(0, 72)}…` : value;
  }
  return value;
}

export async function lookupNameservers(domain: string): Promise<string[]> {
  const resolver = new Resolver();
  try {
    const records = await resolver.resolveNs(domain);
    return records.map((row) => row.replace(/\.$/, "").toLowerCase()).sort();
  } catch {
    return [];
  }
}

export async function lookupRecords(hostname: string, type: "A" | "AAAA" | "CNAME" | "MX" | "TXT"): Promise<string[]> {
  const resolver = new Resolver();
  try {
    if (type === "A") return await resolver.resolve4(hostname);
    if (type === "AAAA") return await resolver.resolve6(hostname);
    if (type === "CNAME") return (await resolver.resolveCname(hostname)).map((row) => row.replace(/\.$/, ""));
    if (type === "MX") return (await resolver.resolveMx(hostname)).map((row) => `${row.priority} ${row.exchange.replace(/\.$/, "")}`);
    return (await resolver.resolveTxt(hostname)).map((row) => row.join(""));
  } catch {
    return [];
  }
}

export async function fetchImrosRdap(fetchImpl: typeof fetch = fetch): Promise<{ source: string; payload: RdapPayload | null }> {
  const urls = [
    `https://rdap.identitydigital.services/rdap/domain/${IMROS_DOMAIN}`,
    `https://rdap.nic.io/domain/${IMROS_DOMAIN}`,
    `https://rdap.org/domain/${IMROS_DOMAIN}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetchImpl(url, { headers: { Accept: "application/rdap+json, application/json" } });
      if (!response.ok) continue;
      const payload = (await response.json()) as RdapPayload;
      if (payload?.ldhName || payload?.entities) return { source: url, payload };
    } catch {
      // try next authoritative RDAP endpoint
    }
  }
  return { source: "UNAVAILABLE", payload: null };
}

export function registrarFromRdap(payload: RdapPayload | null): { name: string; iana: string | null; expiry: string | null; status: string[]; lock: string } {
  if (!payload) return { name: "UNKNOWN", iana: null, expiry: null, status: [], lock: "UNKNOWN" };
  const registrar = (payload.entities ?? []).find((row) => (row.roles ?? []).includes("registrar"));
  const fn = registrar?.vcardArray?.[1]?.find((row) => row[0] === "fn")?.[3] ?? "";
  const iana = registrar?.publicIds?.find((row) => /iana/i.test(row.type ?? ""))?.identifier ?? null;
  const expiry = payload.events?.find((row) => row.eventAction === "expiration")?.eventDate ?? null;
  const status = payload.status ?? [];
  const lock = status.some((row) => /transfer prohibited|clienttransferprohibited/i.test(row))
    ? "LOCKED"
    : status.length
      ? "UNLOCKED_OR_UNSPECIFIED"
      : "UNKNOWN";
  return { name: fn || "UNKNOWN", iana, expiry, status, lock };
}

export async function inventoryImrosDns(): Promise<{ rows: DnsInventoryRow[]; email: EmailDnsSafety }> {
  const hosts = [
    { hostname: IMROS_DOMAIN, purpose: "public Infinity operations site" },
    { hostname: `www.${IMROS_DOMAIN}`, purpose: "www alias for public site" },
    { hostname: IMROS_HQ_HOST, purpose: "private Founder HQ" },
  ];
  const rows: DnsInventoryRow[] = [];
  for (const host of hosts) {
    const a = await lookupRecords(host.hostname, "A");
    const aaaa = await lookupRecords(host.hostname, "AAAA");
    const cname = await lookupRecords(host.hostname, "CNAME");
    for (const value of a) rows.push(row(host.hostname, "A", value, host.purpose));
    for (const value of aaaa) rows.push(row(host.hostname, "AAAA", value, host.purpose));
    for (const value of cname) rows.push(row(host.hostname, "CNAME", value, host.purpose));
    if (!a.length && !aaaa.length && !cname.length) {
      rows.push({
        hostname: host.hostname,
        type: "NONE",
        target: host.hostname === IMROS_HQ_HOST ? "NOT_YET_PROVISIONED" : "UNRESOLVED",
        ttl: null,
        proxied: "UNKNOWN",
        purpose: host.purpose,
      });
    }
  }
  const mx = await lookupRecords(IMROS_DOMAIN, "MX");
  const txt = await lookupRecords(IMROS_DOMAIN, "TXT");
  for (const value of mx) rows.push(row(IMROS_DOMAIN, "MX", value, "email routing"));
  for (const value of txt) rows.push(row(IMROS_DOMAIN, "TXT", redactDnsTarget("TXT", value), "email/auth/verification"));
  const spf = txt.some((value) => /v=spf1/i.test(value));
  const dmarc = txt.some((value) => /v=dmarc1/i.test(value));
  const dkim = txt.some((value) => /v=dkim1/i.test(value));
  const email: EmailDnsSafety = {
    mx: mx.length ? "PASS" : "UNKNOWN",
    spf: spf ? "PASS" : "UNKNOWN",
    dkim: dkim ? "PASS" : "UNKNOWN",
    dmarc: dmarc ? "PASS" : "UNKNOWN",
    notes: mx.length ? [] : ["no_mx_observed_publicly"],
  };
  return { rows, email };
}

export async function readCloudflareImrosZone(env: NodeJS.Dict<string> = process.env, fetchImpl: typeof fetch = fetch): Promise<{
  zone: ImrosDomainVerification["cloudflare_zone"];
  nameservers: string[];
  security: ImrosDomainVerification["cloudflare_security"];
  records: Array<{ type: string; name: string; content: string; proxied: boolean; ttl: number }>;
  source: string;
}> {
  const token = (env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const empty = {
    zone: "UNKNOWN" as const,
    nameservers: [] as string[],
    security: {
      ssl_mode: "UNKNOWN",
      always_use_https: "UNKNOWN",
      hsts: "UNKNOWN",
      waf: "UNKNOWN",
      bot_protection: "UNKNOWN",
      rate_limiting: "UNKNOWN",
    },
    records: [],
    source: token ? "CLOUDFLARE_API" : "CLOUDFLARE_TOKEN_ABSENT",
  };
  if (!token) return { ...empty, zone: "UNKNOWN" };
  try {
    const zones = await cfGet<{ result?: Array<{ id?: string; name?: string; status?: string; name_servers?: string[] }> }>(
      token,
      `/zones?name=${IMROS_DOMAIN}`,
      fetchImpl,
    );
    const zone = zones.result?.[0];
    if (!zone?.id) return { ...empty, zone: "NOT_APPLICABLE", source: "CLOUDFLARE_API_NO_ZONE" };
    const settings = await Promise.all([
      cfSetting(token, zone.id, "ssl", fetchImpl),
      cfSetting(token, zone.id, "always_use_https", fetchImpl),
      cfSetting(token, zone.id, "security_header", fetchImpl),
    ]);
    const dns = await cfGet<{ result?: Array<{ type?: string; name?: string; content?: string; proxied?: boolean; ttl?: number }> }>(
      token,
      `/zones/${zone.id}/dns_records?per_page=100`,
      fetchImpl,
    );
    return {
      zone: zone.status === "active" ? "ACTIVE" : "INACTIVE",
      nameservers: (zone.name_servers ?? []).map((row) => row.toLowerCase()),
      security: {
        ssl_mode: String(settings[0] ?? "UNKNOWN"),
        always_use_https: String(settings[1] ?? "UNKNOWN"),
        hsts: settings[2] && JSON.stringify(settings[2]).includes("max_age") ? "CONFIGURED" : "OFF_OR_UNKNOWN",
        waf: "UNKNOWN",
        bot_protection: "UNKNOWN",
        rate_limiting: "UNKNOWN",
      },
      records: (dns.result ?? []).map((row) => ({
        type: row.type ?? "UNKNOWN",
        name: row.name ?? "",
        content: redactDnsTarget(row.type ?? "", row.content ?? ""),
        proxied: Boolean(row.proxied),
        ttl: row.ttl ?? 0,
      })),
      source: "CLOUDFLARE_API",
    };
  } catch {
    return empty;
  }
}

export function assembleImrosVerification(input: {
  now: string;
  rdapSource: string;
  rdap: ReturnType<typeof registrarFromRdap>;
  nameservers: string[];
  inventory: DnsInventoryRow[];
  email: EmailDnsSafety;
  cloudflare: Awaited<ReturnType<typeof readCloudflareImrosZone>>;
}): ImrosDomainVerification {
  const dnsProvider = classifyDnsProvider(input.nameservers);
  const registrarKind = classifyRegistrar(input.rdap.name);
  const hq = input.inventory.find((row) => row.hostname === IMROS_HQ_HOST && row.type !== "NONE" && row.target !== "NOT_YET_PROVISIONED")
    ?? input.inventory.find((row) => row.hostname === IMROS_HQ_HOST);
  const publicA = input.inventory.find((row) => row.hostname === IMROS_DOMAIN && (row.type === "A" || row.type === "CNAME"));
  const hqProvisioned = Boolean(hq && hq.type !== "NONE" && hq.target && hq.target !== "NOT_YET_PROVISIONED");
  const record: VentureDomainRecord = {
    domain: IMROS_DOMAIN,
    venture_id: "infinity-os",
    registrar: input.rdap.name,
    registrar_iana: input.rdap.iana,
    registrar_kind: registrarKind,
    registrar_verified_at: input.rdap.name === "UNKNOWN" ? null : input.now,
    authoritative_dns_provider: dnsProvider,
    nameservers: input.nameservers,
    dnssec_state: "UNKNOWN",
    renewal_state: input.rdap.expiry ? `expires:${input.rdap.expiry}` : "UNKNOWN",
    expiry_date: input.rdap.expiry,
    registrar_lock: input.rdap.lock,
    public_site_target: publicA ? IMROS_PUBLIC_ORIGIN : "UNRESOLVED",
    hq_target: hqProvisioned ? `https://${IMROS_HQ_HOST}` : "NOT_YET_PROVISIONED",
    runtime_target: `https://${INFINITY_RUNTIME_HOST}`,
    last_verified_at: input.now,
    verification_source: [input.rdapSource, "live_ns_delegation", input.cloudflare.source].filter(Boolean),
  };
  const registration = evaluateDomainRegistrationTruthGate({
    registrar: record.registrar,
    source: record.verification_source,
  });
  const authoritative = evaluateAuthoritativeDNSGate({
    nameservers: record.nameservers,
    provider: record.authoritative_dns_provider,
  });
  const zone = evaluateCloudflareZoneTruthGate({
    zone: input.cloudflare.zone,
    expected_ns: input.cloudflare.nameservers,
    actual_ns: input.nameservers,
    dns_provider: dnsProvider,
  });
  const topology = evaluateInfinityDomainTopologyGate({
    public_site: record.public_site_target,
    hq: record.hq_target,
    runtime: record.runtime_target,
  });
  return {
    record,
    inventory: input.inventory,
    email: input.email,
    cloudflare_zone: input.cloudflare.zone,
    cloudflare_zone_nameservers: input.cloudflare.nameservers,
    cloudflare_security: input.cloudflare.security,
    gates: { registration, authoritative_dns: authoritative, cloudflare_zone: zone, topology },
  };
}

export async function verifyImrosDomainInfrastructure(options: {
  now?: string;
  persist?: boolean;
  cwd?: string;
  env?: NodeJS.Dict<string>;
  fetchImpl?: typeof fetch;
} = {}): Promise<ImrosDomainVerification> {
  const now = options.now ?? new Date().toISOString();
  const rdap = await fetchImrosRdap(options.fetchImpl);
  const parsed = registrarFromRdap(rdap.payload);
  const nameservers = rdap.payload?.nameservers?.map((row) => (row.ldhName ?? "").replace(/\.$/, "").toLowerCase()).filter(Boolean) ?? [];
  const liveNs = await lookupNameservers(IMROS_DOMAIN);
  const ns = liveNs.length ? liveNs : nameservers;
  const dns = await inventoryImrosDns();
  const cloudflare = await readCloudflareImrosZone(options.env, options.fetchImpl);
  const signed = rdap.payload?.secureDNS?.delegationSigned;
  const dnssec = signed === true ? "SIGNED" : signed === false ? "UNSIGNED" : "UNKNOWN";
  const verification = assembleImrosVerification({
    now,
    rdapSource: rdap.source,
    rdap: parsed,
    nameservers: ns,
    inventory: mergeCloudflareInventory(dns.rows, cloudflare.records),
    email: dns.email,
    cloudflare,
  });
  verification.record.dnssec_state = dnssec;
  if (options.persist !== false) persistVentureDomainRegistry(verification, options.cwd ?? process.cwd());
  return verification;
}

export function emptyCloudflareSecurity(): ImrosDomainVerification["cloudflare_security"] {
  return {
    ssl_mode: "UNKNOWN",
    always_use_https: "UNKNOWN",
    hsts: "UNKNOWN",
    waf: "UNKNOWN",
    bot_protection: "UNKNOWN",
    rate_limiting: "UNKNOWN",
  };
}

function row(hostname: string, type: string, target: string, purpose: string): DnsInventoryRow {
  return { hostname, type, target, ttl: null, proxied: "UNKNOWN", purpose };
}

function mergeCloudflareInventory(
  rows: DnsInventoryRow[],
  records: Array<{ type: string; name: string; content: string; proxied: boolean; ttl: number }>,
): DnsInventoryRow[] {
  if (!records.length) return rows;
  const next = [...rows];
  for (const record of records) {
    const hostname = record.name.replace(/\.$/, "").toLowerCase();
    if (!/^(imros\.io|www\.imros\.io|hq\.imros\.io)$/.test(hostname) && !hostname.endsWith(".imros.io")) continue;
    const existing = next.find((row) => row.hostname === hostname && row.type === record.type);
    if (existing) {
      existing.proxied = record.proxied ? "PROXIED" : "DNS_ONLY";
      existing.ttl = record.ttl;
      existing.target = record.content;
    } else {
      next.push({
        hostname,
        type: record.type,
        target: record.content,
        ttl: record.ttl,
        proxied: record.proxied ? "PROXIED" : "DNS_ONLY",
        purpose: hostname.startsWith("hq.") ? "private Founder HQ" : "inventory",
      });
    }
  }
  return next;
}

async function cfGet<T>(token: string, path: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`CLOUDFLARE_HTTP_${response.status}`);
  return (await response.json()) as T;
}

async function cfSetting(token: string, zoneId: string, setting: string, fetchImpl: typeof fetch): Promise<unknown> {
  try {
    const json = await cfGet<{ result?: { value?: unknown } }>(token, `/zones/${zoneId}/settings/${setting}`, fetchImpl);
    return json.result?.value ?? "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export function registryExists(cwd = process.cwd()): boolean {
  return existsSync(domainRegistryPath(cwd));
}
