import { CRE_VENTURE_ID } from "./constants";
import { UNCONFIGURED, type DomainAcquisitionPlan, type DomainCapabilityId, type DomainPurchaseAuthorization, type DnsWorkflowStep } from "./types";

export const DOMAIN_CAPABILITIES: DomainCapabilityId[] = [
  "domain.search",
  "domain.availability.verify",
  "domain.registration.readback",
  "domain.ownership.verify",
  "dns.zone.discover",
  "dns.record.plan",
  "dns.record.mutate",
  "dns.verify",
  "ssl.verify",
  "canonical_domain.verify",
];

export const DNS_WORKFLOW: DnsWorkflowStep[] = [
  "SELECTED_DOMAIN",
  "OWNERSHIP_VERIFICATION",
  "PROVIDER_BINDING",
  "DNS_PLAN",
  "DNS_EXECUTION_AUTHORIZATION",
  "DNS_MUTATION",
  "PROPAGATION_VERIFICATION",
  "SSL_VERIFICATION",
  "DEPLOYMENT_CANONICAL_DOMAIN_BINDING",
  "CANONICAL_URL_VALIDATION",
  "SEO_GEO_VALIDATION",
  "VENTURE_RECORD_RECONCILIATION",
];

export function buildDomainAcquisitionPlan(ventureId: string = CRE_VENTURE_ID): DomainAcquisitionPlan {
  return {
    gate: "DomainAcquisitionPlan",
    ventureId,
    selectedDomain: UNCONFIGURED,
    requiredCapabilities: DOMAIN_CAPABILITIES,
    treasuryRequired: true,
    economicActionGovernanceRequired: true,
    costVerificationRequired: true,
    ventureIdentityVerificationRequired: true,
    domainSelectionEvidenceRequired: true,
    duplicateDomainProtectionRequired: true,
    purchaseAuthorized: false,
    purchaseExecuted: false,
  };
}

export function buildDomainPurchaseAuthorization(): DomainPurchaseAuthorization {
  return {
    gate: "DomainPurchaseAuthorization",
    authorization: "DOMAIN_ACQUISITION",
    status: "NOT_GRANTED",
    rawFinancialCredentialsExposed: false,
    purchaseAllowed: false,
  };
}

export function domainArchitectureIsProviderNeutral(): boolean {
  return !DOMAIN_CAPABILITIES.some((capability) => /namecheap|cloudflare/i.test(capability));
}
