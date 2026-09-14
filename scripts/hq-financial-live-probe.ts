import { HQ_LIVE_PROOF_HEADER } from "../lib/infinity/operator-console/local-hq-proof";

type Metric = { id?: string; display?: string; provenance?: { freshness?: string; source?: string } };
type Payload = {
  financialTruth?: {
    mercury?: { connection?: string };
    cash?: { verified_liquid_cash?: number | null };
    stripe?: { available?: number | null; pending?: number | null };
    last_financial_sync?: string | null;
    metrics?: Metric[];
    gates?: { hq_live_financial_refresh?: { result?: string } };
  };
};

function pick(view: Payload["financialTruth"], id: string): Metric | undefined {
  return view?.metrics?.find((row) => row.id === id);
}

async function get(catchUp: boolean): Promise<{ status: number; body: Payload }> {
  const res = await fetch("http://127.0.0.1:3000/api/operator-console/hq-live-state", {
    headers: {
      [HQ_LIVE_PROOF_HEADER]: "1",
      ...(catchUp ? { "x-hq-catch-up": "1" } : {}),
    },
  });
  const body = (await res.json()) as Payload;
  return { status: res.status, body };
}

async function main() {
  const first = await get(false);
  const second = await get(true);
  const a = first.body.financialTruth;
  const b = second.body.financialTruth;
  const report = {
    http: first.status,
    mercury_visible: Boolean(pick(a, "mercury_cash")),
    liquid_visible: Boolean(pick(a, "verified_liquid_cash")),
    stripe_available_visible: Boolean(pick(a, "stripe_available")),
    stripe_pending_visible: Boolean(pick(a, "stripe_pending")),
    freshness_visible: Boolean(pick(a, "last_financial_sync") || a?.last_financial_sync),
    mercury_connection: b?.mercury?.connection ?? a?.mercury?.connection ?? "MISSING",
    mercury_display: pick(b, "mercury_cash")?.display ?? pick(a, "mercury_cash")?.display ?? null,
    liquid_display: pick(b, "verified_liquid_cash")?.display ?? pick(a, "verified_liquid_cash")?.display ?? null,
    catch_up_has_financial_truth: Boolean(b),
    sync_updated_or_present: Boolean(b?.last_financial_sync),
    freshness: pick(b, "last_financial_sync")?.provenance?.freshness ?? pick(a, "last_financial_sync")?.provenance?.freshness ?? null,
    hq_live_financial_refresh: b?.gates?.hq_live_financial_refresh?.result ?? a?.gates?.hq_live_financial_refresh?.result ?? "MISSING",
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main().catch(() => {
  process.stdout.write('{"http":0,"mercury_visible":false}\n');
  process.exit(1);
});
