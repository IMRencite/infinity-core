import {
  AUTHORITATIVE_DNS_GATE,
  CLOUDFLARE_ZONE_TRUTH_GATE,
  DOMAIN_REGISTRATION_TRUTH_GATE,
  INFINITY_DOMAIN_TOPOLOGY_GATE,
  type DomainNamedGate,
  type DomainProviderKind,
  type ImrosDomainVerification,
} from "./types";

export function evaluateDomainRegistrationTruthGate(input: {
  registrar: string;
  source: string[];
}): DomainNamedGate {
  const authoritative = input.source.some((row) => /rdap|registry/i.test(row));
  const known = Boolean(input.registrar && input.registrar !== "UNKNOWN");
  return {
    gate: DOMAIN_REGISTRATION_TRUTH_GATE,
    result: authoritative && known ? "PASS" : "FAIL",
    reasons: authoritative && known ? [input.registrar] : ["registrar_not_authoritatively_verified"],
  };
}

export function evaluateAuthoritativeDNSGate(input: {
  nameservers: string[];
  provider: DomainProviderKind;
}): DomainNamedGate {
  const ok = input.nameservers.length >= 2 && input.provider !== "UNKNOWN";
  return {
    gate: AUTHORITATIVE_DNS_GATE,
    result: ok ? "PASS" : "FAIL",
    reasons: ok ? input.nameservers : ["nameserver_delegation_unverified"],
  };
}

export function evaluateCloudflareZoneTruthGate(input: {
  zone: ImrosDomainVerification["cloudflare_zone"];
  expected_ns: string[];
  actual_ns: string[];
  dns_provider: DomainProviderKind;
}): DomainNamedGate {
  if (input.dns_provider !== "CLOUDFLARE" && input.zone === "NOT_APPLICABLE") {
    return { gate: CLOUDFLARE_ZONE_TRUTH_GATE, result: "NOT_APPLICABLE", reasons: ["cloudflare_not_authoritative"] };
  }
  if (input.zone === "UNKNOWN") {
    return { gate: CLOUDFLARE_ZONE_TRUTH_GATE, result: "UNKNOWN", reasons: ["cloudflare_zone_unreadable"] };
  }
  const match =
    input.zone === "ACTIVE" &&
    input.expected_ns.length > 0 &&
    input.actual_ns.every((ns) => input.expected_ns.some((expected) => expected.toLowerCase() === ns.toLowerCase()));
  return {
    gate: CLOUDFLARE_ZONE_TRUTH_GATE,
    result: match ? "PASS" : "FAIL",
    reasons: match ? ["zone_matches_delegation"] : ["zone_delegation_mismatch"],
  };
}

export function evaluateInfinityDomainTopologyGate(input: {
  public_site: string;
  hq: string;
  runtime: string;
}): DomainNamedGate {
  const reasons: string[] = [];
  if (!input.public_site || input.public_site === "UNRESOLVED") reasons.push("public_site_missing");
  if (!input.hq.includes("NOT_YET_PROVISIONED") && !/hq\.imros\.io/i.test(input.hq)) reasons.push("hq_topology_unclear");
  if (!input.runtime) reasons.push("runtime_target_missing");
  return {
    gate: INFINITY_DOMAIN_TOPOLOGY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["public_hq_runtime_recorded"],
  };
}
