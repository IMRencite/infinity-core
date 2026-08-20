import { DEFAULT_CURRENCY } from "../constants";
import type { LedgerEntryType, LedgerSubtype, ProviderTransactionClass, ProviderTruthClass, TreasuryBudgetCategory } from "../constants";
import { newId, nowIso, type TreasuryStore } from "../store";
import { actualAmount, type EpistemicAmount, type TreasuryLedgerEntry, type TreasuryTransaction } from "../types";

export type RecordLedgerInput = {
  organizationId: string;
  ventureId?: string | null;
  missionId?: string | null;
  type: LedgerEntryType;
  subtype?: LedgerSubtype | null;
  amount: EpistemicAmount;
  currency?: string;
  provider?: string | null;
  providerTransactionId?: string | null;
  financialActionRequestId?: string | null;
  authorizationId?: string | null;
  externalActionId?: string | null;
  commercialPaymentEventId?: string | null;
  occurredAt?: string;
  idempotencyKey: string;
};

export function recordLedgerEntry(store: TreasuryStore, input: RecordLedgerInput): TreasuryLedgerEntry {
  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey, store.ledger);
  if (existing) return existing;

  if (input.type === "REVENUE" && (input.subtype === "FOUNDER_CAPITAL" || input.subtype === "INVESTOR_CAPITAL")) {
    throw new Error("CAPITAL_CONTRIBUTION_IS_NOT_REVENUE");
  }

  const entry: TreasuryLedgerEntry = {
    entryId: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    missionId: input.missionId ?? null,
    type: input.type,
    subtype: input.subtype ?? null,
    amount: input.amount,
    currency: input.currency ?? input.amount.currency ?? DEFAULT_CURRENCY,
    provider: input.provider ?? null,
    providerTransactionId: input.providerTransactionId ?? null,
    financialActionRequestId: input.financialActionRequestId ?? null,
    authorizationId: input.authorizationId ?? null,
    externalActionId: input.externalActionId ?? null,
    commercialPaymentEventId: input.commercialPaymentEventId ?? null,
    occurredAt: input.occurredAt ?? nowIso(),
    createdAt: nowIso(),
    actuality: input.amount.actuality,
    idempotencyKey: input.idempotencyKey,
  };
  store.ledger.set(entry.entryId, entry);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, entry.entryId);
  return entry;
}

export function ingestProviderTransaction(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId?: string | null;
    accountId?: string | null;
    provider: string;
    providerTransactionId: string;
    amount: EpistemicAmount;
    classification: ProviderTransactionClass;
    merchant?: string | null;
    category?: TreasuryBudgetCategory | null;
    purpose?: string | null;
    financialActionRequestId?: string | null;
    authorizationId?: string | null;
    occurredAt: string;
    status?: TreasuryTransaction["status"];
    truthClass?: ProviderTruthClass;
  },
): { transaction: TreasuryTransaction; ledger: TreasuryLedgerEntry | null; duplicate: boolean } {
  const existing = store.findTransactionByProviderId(input.organizationId, input.provider, input.providerTransactionId);
  if (existing) {
    const ledger = [...store.ledger.values()].find(
      (e) => e.organizationId === input.organizationId && e.providerTransactionId === input.providerTransactionId,
    ) ?? null;
    return { transaction: existing, ledger, duplicate: true };
  }

  const transaction: TreasuryTransaction = {
    transactionId: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    accountId: input.accountId ?? null,
    provider: input.provider,
    providerTransactionId: input.providerTransactionId,
    amount: input.amount,
    classification: input.classification,
    merchant: input.merchant ?? null,
    category: input.category ?? null,
    purpose: input.purpose ?? null,
    financialActionRequestId: input.financialActionRequestId ?? null,
    authorizationId: input.authorizationId ?? null,
    occurredAt: input.occurredAt,
    status: input.status ?? "POSTED",
    createdAt: nowIso(),
  };
  store.transactions.set(transaction.transactionId, transaction);
  store.registerProviderTransaction(input.organizationId, input.provider, input.providerTransactionId, transaction.transactionId);

  const mapped = mapClassificationToLedger(input.classification);
  const skipLedger = input.truthClass === "PROVIDER_SANDBOX";
  const ledger =
    !skipLedger && mapped && input.classification !== "UNKNOWN"
      ? recordLedgerEntry(store, {
          organizationId: input.organizationId,
          ventureId: input.ventureId,
          type: mapped.type,
          subtype: mapped.subtype,
          amount: input.amount,
          provider: input.provider,
          providerTransactionId: input.providerTransactionId,
          financialActionRequestId: input.financialActionRequestId,
          authorizationId: input.authorizationId,
          occurredAt: input.occurredAt,
          idempotencyKey: `ledger:txn:${input.provider}:${input.providerTransactionId}`,
        })
      : null;

  return { transaction, ledger, duplicate: false };
}

function mapClassificationToLedger(
  classification: ProviderTransactionClass,
): { type: LedgerEntryType; subtype: LedgerSubtype | null } | null {
  switch (classification) {
    case "EXPENSE":
      return { type: "EXPENSE", subtype: null };
    case "REVENUE":
      return { type: "REVENUE", subtype: "GROSS_REVENUE" };
    case "TRANSFER":
      return { type: "TRANSFER", subtype: "INTERNAL_TRANSFER" };
    case "CAPITAL_CONTRIBUTION":
      return { type: "CAPITAL_CONTRIBUTION", subtype: "FOUNDER_CAPITAL" };
    case "REFUND":
      return { type: "REFUND", subtype: null };
    case "CHARGEBACK":
      return { type: "CHARGEBACK", subtype: null };
    default:
      return null;
  }
}

export function sumLedger(
  store: TreasuryStore,
  organizationId: string,
  type: LedgerEntryType,
  ventureId?: string | null,
): { amount: EpistemicAmount; complete: boolean } {
  let total = 0;
  let sawUnknown = false;
  let sawAny = false;
  for (const entry of store.scoped(organizationId, store.ledger)) {
    if (entry.type !== type) continue;
    if (ventureId && entry.ventureId !== ventureId) continue;
    sawAny = true;
    if (entry.actuality === "UNKNOWN" || entry.amount.value == null) {
      sawUnknown = true;
      continue;
    }
    total += entry.amount.value;
  }
  if (!sawAny) return { amount: { value: null, actuality: "UNKNOWN", currency: DEFAULT_CURRENCY }, complete: false };
  if (sawUnknown) return { amount: { value: null, actuality: "UNKNOWN", currency: DEFAULT_CURRENCY }, complete: false };
  return { amount: actualAmount(total), complete: true };
}

export function netRevenue(store: TreasuryStore, organizationId: string, ventureId?: string | null): EpistemicAmount {
  const gross = sumLedger(store, organizationId, "REVENUE", ventureId);
  const refunds = sumLedger(store, organizationId, "REFUND", ventureId);
  const chargebacks = sumLedger(store, organizationId, "CHARGEBACK", ventureId);
  if (!gross.complete) return { value: null, actuality: "UNKNOWN", currency: DEFAULT_CURRENCY };
  const refundValue = refunds.complete ? refunds.amount.value ?? 0 : null;
  const chargebackValue = chargebacks.complete ? chargebacks.amount.value ?? 0 : 0;
  if (refundValue == null && refunds.amount.actuality === "UNKNOWN" && (refunds.amount.value != null || !refunds.complete)) {
    if (!refunds.complete && store.scoped(organizationId, store.ledger).some((e) => e.type === "REFUND")) {
      return { value: null, actuality: "UNKNOWN", currency: DEFAULT_CURRENCY };
    }
  }
  const refundAdj = refunds.complete ? refunds.amount.value ?? 0 : 0;
  return actualAmount((gross.amount.value ?? 0) - refundAdj - chargebackValue);
}

export function categoryToSubtype(category: TreasuryBudgetCategory): LedgerSubtype {
  switch (category) {
    case "AI_API":
      return "AI_API_SPEND";
    case "HOSTING":
      return "HOSTING_SPEND";
    case "DOMAINS":
      return "DOMAIN_SPEND";
    case "CREATIVE_MEDIA":
      return "CREATIVE_MEDIA_SPEND";
    case "SOFTWARE_TOOLS":
      return "SOFTWARE_SPEND";
    case "MARKETING":
      return "MARKETING_SPEND";
    case "VENDORS_CONTRACTORS":
      return "VENDOR_SPEND";
    case "PAYMENT_PROCESSING":
      return "PAYMENT_PROCESSING_FEE";
    default:
      return "SOFTWARE_SPEND";
  }
}
