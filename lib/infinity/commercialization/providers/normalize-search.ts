import type { DomainSearchResult } from "./contracts";
import { normalizePremiumFlag, normalizeUsdAmount } from "./money";

export function normalizeDomainSearchResult(input: {
  domain: string;
  available?: boolean | null;
  registrationPriceUsd?: number | null;
  renewalPriceUsd?: number | null;
  priceTruth?: DomainSearchResult["priceTruth"];
  currency?: string;
  premium?: boolean | null;
}): DomainSearchResult & { premium: boolean | null } {
  const registrationPriceUsd = normalizeUsdAmount(input.registrationPriceUsd);
  const renewalPriceUsd = normalizeUsdAmount(input.renewalPriceUsd);
  const priceTruth =
    input.priceTruth ??
    (registrationPriceUsd == null && renewalPriceUsd == null ? "UNKNOWN" : registrationPriceUsd != null ? "ESTIMATE" : "UNKNOWN");
  return {
    domain: input.domain,
    available: input.available === true,
    registrationPriceUsd,
    renewalPriceUsd,
    priceTruth,
    currency: input.currency ?? "USD",
    premium: normalizePremiumFlag(input.premium),
  };
}
