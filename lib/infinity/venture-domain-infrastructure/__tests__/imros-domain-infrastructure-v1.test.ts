import { describe, expect, it } from "vitest";
import {
  assembleImrosVerification,
  classifyDnsProvider,
  classifyRegistrar,
  evaluateAuthoritativeDNSGate,
  evaluateCloudflareZoneTruthGate,
  evaluateDomainRegistrationTruthGate,
  evaluateInfinityDomainTopologyGate,
  registrarFromRdap,
} from "../index";

describe("IMROS domain infrastructure", () => {
  it("does not infer registrar from nameservers", () => {
    expect(classifyDnsProvider(["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"])).toBe("CLOUDFLARE");
    expect(classifyRegistrar("Squarespace Domains II LLC")).toBe("OTHER");
    expect(classifyRegistrar("Cloudflare, Inc.")).toBe("CLOUDFLARE");
    const registration = evaluateDomainRegistrationTruthGate({
      registrar: "Squarespace Domains II LLC",
      source: ["https://rdap.nic.io/domain/imros.io"],
    });
    expect(registration.result).toBe("PASS");
    expect(evaluateDomainRegistrationTruthGate({
      registrar: "UNKNOWN",
      source: ["whois_scrape"],
    }).result).toBe("FAIL");
  });

  it("passes DNS, Cloudflare zone match, and Infinity topology independently", () => {
    expect(evaluateAuthoritativeDNSGate({
      nameservers: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
      provider: "CLOUDFLARE",
    }).result).toBe("PASS");
    expect(evaluateCloudflareZoneTruthGate({
      zone: "ACTIVE",
      expected_ns: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
      actual_ns: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
      dns_provider: "CLOUDFLARE",
    }).result).toBe("PASS");
    expect(evaluateCloudflareZoneTruthGate({
      zone: "NOT_APPLICABLE",
      expected_ns: [],
      actual_ns: ["ns1.squarespacedns.com"],
      dns_provider: "OTHER",
    }).result).toBe("NOT_APPLICABLE");
    expect(evaluateInfinityDomainTopologyGate({
      public_site: "https://imros.io",
      hq: "NOT_YET_PROVISIONED",
      runtime: "https://infinity-runtime.vercel.app",
    }).result).toBe("PASS");
  });

  it("assembles a registry record without secrets", () => {
    const rdap = registrarFromRdap({
      ldhName: "imros.io",
      status: ["client transfer prohibited"],
      entities: [{
        roles: ["registrar"],
        vcardArray: ["vcard", [["fn", {}, "text", "Example Registrar"]]],
        publicIds: [{ type: "IANA Registrar ID", identifier: "1910" }],
      }],
      events: [{ eventAction: "expiration", eventDate: "2027-01-01T00:00:00Z" }],
    });
    expect(rdap.name).toBe("Example Registrar");
    expect(rdap.lock).toBe("LOCKED");
    const verification = assembleImrosVerification({
      now: "2026-09-17T00:00:00.000Z",
      rdapSource: "https://rdap.nic.io/domain/imros.io",
      rdap,
      nameservers: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
      inventory: [
        { hostname: "imros.io", type: "A", target: "216.150.1.1", ttl: 300, proxied: "PROXIED", purpose: "public Infinity operations site" },
        { hostname: "hq.imros.io", type: "NONE", target: "NOT_YET_PROVISIONED", ttl: null, proxied: "UNKNOWN", purpose: "private Founder HQ" },
      ],
      email: { mx: "UNKNOWN", spf: "PASS", dkim: "UNKNOWN", dmarc: "UNKNOWN", notes: [] },
      cloudflare: {
        zone: "ACTIVE",
        nameservers: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
        security: {
          ssl_mode: "flexible",
          always_use_https: "on",
          hsts: "OFF_OR_UNKNOWN",
          waf: "UNKNOWN",
          bot_protection: "UNKNOWN",
          rate_limiting: "UNKNOWN",
        },
        records: [],
        source: "CLOUDFLARE_API",
      },
    });
    expect(verification.record.registrar).toBe("Example Registrar");
    expect(verification.record.authoritative_dns_provider).toBe("CLOUDFLARE");
    expect(verification.record.hq_target).toBe("NOT_YET_PROVISIONED");
    const provisioned = assembleImrosVerification({
      now: "2026-09-17T00:00:00.000Z",
      rdapSource: "https://rdap.nic.io/domain/imros.io",
      rdap,
      nameservers: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
      inventory: [
        { hostname: "imros.io", type: "A", target: "216.150.1.1", ttl: 300, proxied: "DNS_ONLY", purpose: "public Infinity operations site" },
        { hostname: "hq.imros.io", type: "NONE", target: "NOT_YET_PROVISIONED", ttl: null, proxied: "UNKNOWN", purpose: "private Founder HQ" },
        { hostname: "hq.imros.io", type: "CNAME", target: "217bb448cfd9bcc0.vercel-dns-016.com", ttl: 1, proxied: "DNS_ONLY", purpose: "private Founder HQ" },
      ],
      email: { mx: "UNKNOWN", spf: "PASS", dkim: "UNKNOWN", dmarc: "UNKNOWN", notes: [] },
      cloudflare: {
        zone: "ACTIVE",
        nameservers: ["dante.ns.cloudflare.com", "poppy.ns.cloudflare.com"],
        security: {
          ssl_mode: "flexible",
          always_use_https: "on",
          hsts: "OFF_OR_UNKNOWN",
          waf: "UNKNOWN",
          bot_protection: "UNKNOWN",
          rate_limiting: "UNKNOWN",
        },
        records: [],
        source: "CLOUDFLARE_API",
      },
    });
    expect(provisioned.record.hq_target).toBe("https://hq.imros.io");
    expect(provisioned.record.public_site_target).toBe("https://imros.io");
    expect(provisioned.record.runtime_target).toBe("https://infinity-runtime.vercel.app");
    expect(JSON.stringify(verification)).not.toMatch(/Bearer |CLOUDFLARE_API_TOKEN|cfut_/);
    expect(verification.gates.registration.result).toBe("PASS");
    expect(verification.gates.authoritative_dns.result).toBe("PASS");
    expect(verification.gates.topology.result).toBe("PASS");
  });
});
