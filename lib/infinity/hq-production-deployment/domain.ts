import { HQ_CUSTOM_DOMAIN_GATE, HQ_PRODUCTION_HOST, HQ_VERCEL_PROJECT, PUBLIC_IMROS_PROJECT, type HqNamedGate } from "./contract";

export function evaluateHQCustomDomainGate(input: {
  projectName: string;
  domain: string;
  vercelAttached: boolean;
  vercelVerified: boolean;
  dnsResolves: boolean;
  correctApplication: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.projectName === PUBLIC_IMROS_PROJECT) reasons.push("DOMAIN_ATTACHED_TO_PUBLIC_PROJECT");
  if (input.projectName !== HQ_VERCEL_PROJECT && input.projectName !== "UNKNOWN") {
    reasons.push("PROJECT_NAME_UNEXPECTED");
  }
  if (input.domain !== HQ_PRODUCTION_HOST) reasons.push("DOMAIN_NOT_CANONICAL");
  if (!input.vercelAttached) reasons.push("VERCEL_DOMAIN_NOT_ATTACHED");
  if (!input.vercelVerified) reasons.push("VERCEL_DOMAIN_UNVERIFIED");
  if (!input.dnsResolves) reasons.push("DNS_UNRESOLVED");
  if (!input.correctApplication) reasons.push("WRONG_APPLICATION_SERVED");
  return {
    gate: HQ_CUSTOM_DOMAIN_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CUSTOM_DOMAIN_BOUND"],
  };
}

export function redactDnsTarget(type: string, target: string): string {
  if (!target) return "UNKNOWN";
  if (type === "CNAME") {
    return target.replace(/^cname\.vercel-dns\.com\.?$/i, "cname.vercel-dns.com").replace(/\.$/, "");
  }
  if (type === "A" || type === "AAAA") return type === "A" ? "A [VERCEL]" : "AAAA [VERCEL]";
  if (type === "TXT") return target.length > 24 ? `${target.slice(0, 16)}…` : target;
  return target;
}
