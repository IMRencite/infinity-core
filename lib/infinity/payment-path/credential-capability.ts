import {
  COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT,
  type CommercialCredentialCapabilityRecord,
  type CredentialCapability,
  type PaymentProviderKind,
} from "./types";
import { LEAST_PRIVILEGE_PAYMENT_CREDENTIAL_RULE } from "./principles";

export const STRIPE_CHECKOUT_REQUIRED_CAPABILITIES = [
  "account.read",
  "product.read",
  "price.read",
  "checkout.session.write",
  "webhook.read",
] as const;

export function evaluateCommercialCredentialCapabilityContract(input: {
  provider: PaymentProviderKind;
  credentialKind?: "RESTRICTED" | "SECRET" | "UNKNOWN";
  proven: Partial<Record<string, "PASS" | "FAIL" | "UNKNOWN">>;
  required?: readonly string[];
}): CommercialCredentialCapabilityRecord {
  const required = input.required ?? (input.provider === "stripe" ? STRIPE_CHECKOUT_REQUIRED_CAPABILITIES : ["payment.create"]);
  const capabilities: CredentialCapability[] = required.map((id) => ({
    id,
    required: true,
    proven: input.proven[id] ?? "UNKNOWN",
  }));
  const reasons = capabilities
    .filter((row) => row.proven !== "PASS")
    .map((row) => `CAPABILITY_${row.id.replace(/\./g, "_").toUpperCase()}_${row.proven}`);
  if (input.credentialKind === "SECRET" && input.provider === "stripe") {
    reasons.push("UNRESTRICTED_KEY_NOT_PREFERRED");
  }
  return {
    contract: COMMERCIAL_CREDENTIAL_CAPABILITY_CONTRACT,
    provider: input.provider,
    credentialKind: input.credentialKind ?? "UNKNOWN",
    preferRestrictedKey: true,
    doNotRequestUnrestrictedKey: true,
    capabilities,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function leastPrivilegePaymentCredentialRule(): string {
  return LEAST_PRIVILEGE_PAYMENT_CREDENTIAL_RULE;
}
