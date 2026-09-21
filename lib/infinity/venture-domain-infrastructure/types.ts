export const VENTURE_DOMAIN_REGISTRY = "VentureDomainRegistry" as const;

export const DOMAIN_REGISTRATION_TRUTH_GATE = "DomainRegistrationTruthGate" as const;
export const AUTHORITATIVE_DNS_GATE = "AuthoritativeDNSGate" as const;
export const CLOUDFLARE_ZONE_TRUTH_GATE = "CloudflareZoneTruthGate" as const;
export const INFINITY_DOMAIN_TOPOLOGY_GATE = "InfinityDomainTopologyGate" as const;

export type DomainProviderKind = "CLOUDFLARE" | "OTHER" | "UNKNOWN";
export type DomainGateResult = "PASS" | "FAIL" | "NOT_APPLICABLE" | "UNKNOWN";

export type VentureDomainRecord = {
  domain: string;
  venture_id: string;
  registrar: string;
  registrar_iana: string | null;
  registrar_kind: DomainProviderKind;
  registrar_verified_at: string | null;
  authoritative_dns_provider: DomainProviderKind;
  nameservers: string[];
  dnssec_state: string;
  renewal_state: string;
  expiry_date: string | null;
  registrar_lock: string;
  public_site_target: string;
  hq_target: string;
  runtime_target: string;
  last_verified_at: string | null;
  verification_source: string[];
};

export type DnsInventoryRow = {
  hostname: string;
  type: string;
  target: string;
  ttl: number | null;
  proxied: "PROXIED" | "DNS_ONLY" | "UNKNOWN";
  purpose: string;
};

export type EmailDnsSafety = {
  mx: DomainGateResult;
  spf: DomainGateResult;
  dkim: DomainGateResult;
  dmarc: DomainGateResult;
  notes: string[];
};

export type DomainNamedGate = {
  gate: string;
  result: DomainGateResult;
  reasons: string[];
};

export type ImrosDomainVerification = {
  record: VentureDomainRecord;
  inventory: DnsInventoryRow[];
  email: EmailDnsSafety;
  cloudflare_zone: "ACTIVE" | "INACTIVE" | "NOT_APPLICABLE" | "UNKNOWN";
  cloudflare_zone_nameservers: string[];
  cloudflare_security: {
    ssl_mode: string;
    always_use_https: string;
    hsts: string;
    waf: string;
    bot_protection: string;
    rate_limiting: string;
  };
  gates: {
    registration: DomainNamedGate;
    authoritative_dns: DomainNamedGate;
    cloudflare_zone: DomainNamedGate;
    topology: DomainNamedGate;
  };
};
