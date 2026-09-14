import "server-only";

import { STRIPE_SECRET_KEY_ENV } from "@/lib/infinity/commercialization/providers/config";
import { centsToUsd, freshnessFromAge, maskAccountRef } from "../amounts";
import { emptyStripeSnapshot } from "../cash-position";
import { matchPayoutDestination } from "../payout-destination";
import { classifySettlementDestination } from "../settlement-destination";
import type { StripeBalanceTxn, StripeCashSnapshot, StripePayoutRecord } from "../types";
import { OCCUPANCYNPV_STRIPE_ACCOUNT_ID } from "../types";

type StripeGet = (path: string) => Promise<{ ok: boolean; status: number; body: unknown }>;

function stripeHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}` };
}

export function createStripeGetter(input: { key: string; fetchImpl?: typeof fetch }): StripeGet {
  const fetchImpl = input.fetchImpl ?? fetch;
  return async (path: string) => {
    const res = await fetchImpl(`https://api.stripe.com${path}`, {
      method: "GET",
      headers: stripeHeaders(input.key),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      try {
        await res.arrayBuffer();
      } catch {
        /* consumed */
      }
    }
    return { ok: res.ok, status: res.status, body };
  };
}

function list(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  return Array.isArray(data) ? data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isoFromUnix(value: unknown): string | null {
  const seconds = num(value);
  if (seconds == null) return null;
  return new Date(seconds * 1000).toISOString();
}

function sumCurrency(rows: Array<{ amount?: unknown; currency?: unknown }>, currency = "usd"): number | null {
  const matched = rows.filter((row) => String(row.currency ?? "usd").toLowerCase() === currency);
  if (matched.length === 0) return 0;
  const cents = matched.reduce((sum, row) => sum + (num(row.amount) ?? 0), 0);
  return centsToUsd(cents);
}

export { matchPayoutDestination };

export function parseStripeBalance(body: unknown): { available: number | null; pending: number | null; currency: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const availableRows = Array.isArray(record.available) ? (record.available as Array<{ amount?: unknown; currency?: unknown }>) : [];
  const pendingRows = Array.isArray(record.pending) ? (record.pending as Array<{ amount?: unknown; currency?: unknown }>) : [];
  return {
    available: sumCurrency(availableRows),
    pending: sumCurrency(pendingRows),
    currency: "USD",
  };
}

export function parseStripePayouts(body: unknown): StripePayoutRecord[] {
  return list(body).map((row) => ({
    safe_id: str(row.id) ?? "po_unknown",
    amount: centsToUsd(num(row.amount)) ?? 0,
    currency: String(row.currency ?? "usd").toUpperCase(),
    status: str(row.status) ?? "unknown",
    arrival_at: isoFromUnix(row.arrival_date),
    created_at: isoFromUnix(row.created) ?? new Date().toISOString(),
    destination_safe_ref: str(row.destination)
      ? maskAccountRef({ id: String(row.destination), provider: "stripe_dest" })
      : null,
  }));
}

export function parseStripeBalanceTransactions(body: unknown): StripeBalanceTxn[] {
  return list(body).map((row) => ({
    safe_id: str(row.id) ?? "txn_unknown",
    type: str(row.type) ?? "unknown",
    reporting_category: str(row.reporting_category),
    amount: centsToUsd(num(row.amount)) ?? 0,
    fee: centsToUsd(num(row.fee)) ?? 0,
    net: centsToUsd(num(row.net)) ?? 0,
    currency: String(row.currency ?? "usd").toUpperCase(),
    created_at: isoFromUnix(row.created) ?? new Date().toISOString(),
    source: str(row.source),
    payout_id: typeof row.payout === "string" ? row.payout : null,
    description: str(row.description),
  }));
}

export async function readLiveStripeSnapshot(input: {
  env?: NodeJS.Dict<string>;
  fetchImpl?: typeof fetch;
  mercuryLast4?: string | null;
}): Promise<StripeCashSnapshot> {
  const env = input.env ?? process.env;
  const key = typeof env[STRIPE_SECRET_KEY_ENV] === "string" ? env[STRIPE_SECRET_KEY_ENV]!.trim() : "";
  if (!key) return emptyStripeSnapshot("FAIL");
  const get = createStripeGetter({ key, fetchImpl: input.fetchImpl });
  try {
    const [account, balance, payouts, txns, banks] = await Promise.all([
      get("/v1/account"),
      get("/v1/balance"),
      get("/v1/payouts?limit=10"),
      get("/v1/balance_transactions?limit=100"),
      get(`/v1/accounts/${OCCUPANCYNPV_STRIPE_ACCOUNT_ID}/external_accounts?object=bank_account&limit=10`),
    ]);
    if (!balance.ok) return emptyStripeSnapshot("FAIL");
    const accountId = str((account.body as { id?: unknown } | null)?.id);
    if (account.ok && accountId && accountId !== OCCUPANCYNPV_STRIPE_ACCOUNT_ID) {
      return emptyStripeSnapshot("FAIL");
    }
    const parsedBalance = parseStripeBalance(balance.body);
    const parsedPayouts = payouts.ok ? parseStripePayouts(payouts.body) : [];
    const parsedTxns = txns.ok ? parseStripeBalanceTransactions(txns.body) : [];
    let bankRows = banks.ok ? list(banks.body) : [];
    if (bankRows.length === 0) {
      const fallback = await get("/v1/external_accounts?object=bank_account&limit=10");
      bankRows = fallback.ok ? list(fallback.body) : [];
    }
    const bank = bankRows[0] ?? null;
    const destination = matchPayoutDestination({
      bankName: str(bank?.bank_name),
      last4: str(bank?.last4),
      mercuryLast4: input.mercuryLast4 ?? null,
    });
    const fees = parsedTxns.filter((row) => row.type === "stripe_fee" || row.fee > 0).reduce((sum, row) => sum + row.fee, 0);
    const net = parsedTxns.filter((row) => row.type === "charge" || row.type === "payment").reduce((sum, row) => sum + row.net, 0);
    const latest = parsedPayouts[0] ?? null;
    const verifiedAt = new Date().toISOString();
    return {
      connection: "LIVE",
      account: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
      available: parsedBalance.available,
      pending: parsedBalance.pending,
      currency: parsedBalance.currency,
      recent_payout_amount: latest?.amount ?? null,
      recent_payout_id: latest?.safe_id ?? null,
      recent_payout_status: latest?.status ?? null,
      payout_destination: destination,
      settlement_destination_classification: classifySettlementDestination(destination),
      last_verified: verifiedAt,
      processor_fees: fees,
      net_settlement: net,
      balance_transactions: parsedTxns,
      payouts: parsedPayouts,
      freshness: freshnessFromAge(verifiedAt),
    };
  } catch {
    return emptyStripeSnapshot("FAIL");
  }
}
