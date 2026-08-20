import { unknownAmount, type EpistemicAmount, type ProviderAccount, type ProviderBalance, type ProviderProvenance, type ProviderTransaction } from "../../types";
import type { ProviderEnvironment, ProviderTruthClass } from "../../constants";

export type MercuryNormalizeContext = {
  environment: Exclude<ProviderEnvironment, "DISABLED">;
  fetchedAt: string;
};

function truthClass(environment: Exclude<ProviderEnvironment, "DISABLED">): ProviderTruthClass {
  return environment === "PRODUCTION" ? "PROVIDER_PRODUCTION" : "PROVIDER_SANDBOX";
}

export function mercuryProvenance(ctx: MercuryNormalizeContext): ProviderProvenance {
  return {
    source: "MERCURY",
    environment: ctx.environment,
    actuality: ctx.environment === "PRODUCTION" ? "PRODUCTION_PROVIDER_DATA" : "SANDBOX_PROVIDER_DATA",
    truthClass: truthClass(ctx.environment),
    fetchedAt: ctx.fetchedAt,
  };
}

function sandboxSafeAmount(value: number | null, currency: string, environment: Exclude<ProviderEnvironment, "DISABLED">): EpistemicAmount {
  if (value == null || !Number.isFinite(value)) return unknownAmount(currency);
  return {
    value,
    actuality: environment === "PRODUCTION" ? "ACTUAL" : "ESTIMATE",
    currency,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function mercuryAccountKind(raw: unknown): ProviderAccount["accountKind"] {
  const value = String(raw ?? "").toLowerCase();
  if (value === "checking") return "CHECKING";
  if (value === "savings") return "SAVINGS";
  if (value === "treasury") return "TREASURY";
  if (value === "card" || value === "credit") return "CARD";
  return "OTHER";
}

export function mercuryAccountStatus(raw: unknown): ProviderAccount["status"] {
  const value = String(raw ?? "").toLowerCase();
  if (value === "active") return "ACTIVE";
  if (value === "frozen" || value === "locked") return "FROZEN";
  if (value === "deleted" || value === "archived" || value === "closed") return "CLOSED";
  if (!value) return "UNKNOWN";
  return "UNKNOWN";
}

export function mercuryTransactionStatus(raw: unknown): ProviderTransaction["status"] {
  const value = String(raw ?? "").toLowerCase();
  if (value === "pending") return "PENDING";
  if (value === "sent" || value === "posted" || value === "completed") return "POSTED";
  if (value === "failed") return "FAILED";
  if (value === "cancelled" || value === "canceled" || value === "reversed") return "REVERSED";
  return "PENDING";
}

export function mercuryTransactionClassification(amount: number | null): ProviderTransaction["classification"] {
  if (amount == null) return "UNKNOWN";
  if (amount < 0) return "EXPENSE";
  if (amount > 0) return "REVENUE";
  return "TRANSFER";
}

export function normalizeMercuryAccount(raw: unknown, ctx: MercuryNormalizeContext): ProviderAccount | null {
  const row = asRecord(raw);
  const id = stringOrNull(row?.id);
  if (!id) return null;
  const displayName = stringOrNull(row?.name) ?? stringOrNull(row?.nickname) ?? "UNKNOWN";
  const currency = stringOrNull(row?.currency) ?? "USD";
  return {
    accountId: id,
    provider: "mercury",
    displayName,
    currency,
    accountKind: mercuryAccountKind(row?.kind ?? row?.type),
    externalAccountId: id,
    status: mercuryAccountStatus(row?.status),
    fetchedAt: ctx.fetchedAt,
    provenance: mercuryProvenance(ctx),
  };
}

export function normalizeMercuryBalance(raw: unknown, ctx: MercuryNormalizeContext): ProviderBalance | null {
  const row = asRecord(raw);
  const id = stringOrNull(row?.id);
  if (!id) return null;
  const currency = stringOrNull(row?.currency) ?? "USD";
  const available = finiteNumber(row?.availableBalance);
  const current = finiteNumber(row?.currentBalance);
  return {
    accountId: id,
    available: sandboxSafeAmount(available, currency, ctx.environment),
    current: sandboxSafeAmount(current, currency, ctx.environment),
    asOf: stringOrNull(row?.updatedAt) ?? ctx.fetchedAt,
    provenance: mercuryProvenance(ctx),
    truthClass: truthClass(ctx.environment),
  };
}

export function normalizeMercuryTransaction(
  raw: unknown,
  accountId: string,
  ctx: MercuryNormalizeContext,
): ProviderTransaction | null {
  const row = asRecord(raw);
  const id = stringOrNull(row?.id);
  if (!id) return null;
  const amount = finiteNumber(row?.amount);
  const currency = stringOrNull(row?.currency) ?? "USD";
  const counterparty =
    stringOrNull(row?.counterpartyName) ?? stringOrNull(row?.counterpartyNickname) ?? stringOrNull(row?.counterpartyId);
  const occurredAt = stringOrNull(row?.postedAt) ?? stringOrNull(row?.createdAt) ?? ctx.fetchedAt;
  return {
    providerTransactionId: id,
    accountId,
    amount: sandboxSafeAmount(amount, currency, ctx.environment),
    classification: mercuryTransactionClassification(amount),
    merchant: counterparty,
    description: stringOrNull(row?.bankDescription) ?? stringOrNull(row?.externalMemo) ?? stringOrNull(row?.note),
    occurredAt,
    status: mercuryTransactionStatus(row?.status),
    providerCategory: stringOrNull(row?.mercuryCategory),
    counterparty,
    provenance: mercuryProvenance(ctx),
  };
}

export function extractMercuryAccounts(payload: unknown): unknown[] {
  const row = asRecord(payload);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(row?.accounts)) return row.accounts;
  return [];
}

export function extractMercuryTransactions(payload: unknown): { transactions: unknown[]; total: number | null } {
  const row = asRecord(payload);
  const transactions = Array.isArray(payload)
    ? payload
    : Array.isArray(row?.transactions)
      ? row.transactions
      : [];
  const total = finiteNumber(row?.total);
  return { transactions, total };
}

export type MercuryPaginationState = {
  offset: number;
  page: number;
  accumulated: number;
  pageSize: number;
  fetchedThisPage: number;
  total: number | null;
  maxPages: number;
  maxRecords: number;
};

export function nextMercuryPage(state: MercuryPaginationState): { done: boolean; nextOffset: number } {
  if (state.fetchedThisPage <= 0) return { done: true, nextOffset: state.offset };
  if (state.page >= state.maxPages) return { done: true, nextOffset: state.offset };
  if (state.accumulated >= state.maxRecords) return { done: true, nextOffset: state.offset };
  if (state.total != null && state.offset + state.fetchedThisPage >= state.total) {
    return { done: true, nextOffset: state.offset + state.fetchedThisPage };
  }
  if (state.fetchedThisPage < state.pageSize) {
    return { done: true, nextOffset: state.offset + state.fetchedThisPage };
  }
  return { done: false, nextOffset: state.offset + state.fetchedThisPage };
}
