const ALLOWED_EXPERIMENT_ID = "exp_e72beb7b6d35e7b20acf";
const MAX_BYTES = 8192;
const RATE_LIMIT = 30;
const WINDOW_MS = 60000;
const EVENT_TYPES = [
  "PAGE_VIEW",
  "PRICING_VIEW",
  "CTA_CLICK",
  "FORM_START",
  "EARLY_ACCESS_REQUEST",
  "PILOT_REQUEST",
  "PRICE_OPTION_SELECTED",
  "QUALIFIED_PILOT_APPLICATION",
  "STRONG_PURCHASE_INTENT",
] as const;
const FORM_KEYS = [
  "name",
  "workEmail",
  "role",
  "company",
  "teamSize",
  "dealFrequency",
  "preferredPricing",
  "leaseWorkflow",
  "pilotInterest",
] as const;

let windowStart = 0;
let acceptedInWindow = 0;
const received: Array<{ at: number; synthetic: boolean; kind: string }> = [];

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

type ParsedBody =
  | { ok: false; error: string }
  | { ok: true; request: { kind: "form" | "event"; synthetic: boolean } };

function parseBody(body: unknown): ParsedBody {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_payload" };
  const record = body as Record<string, unknown>;
  const kind = record.kind === "form" ? "form" : record.kind === "event" || record.type ? "event" : null;
  if (!kind) return { ok: false, error: "invalid_payload" };
  if (kind === "form") {
    const form = record.form && typeof record.form === "object" && !Array.isArray(record.form) ? (record.form as Record<string, unknown>) : record;
    const extra = Object.keys(form).filter((key) => !(FORM_KEYS as readonly string[]).includes(key) && key !== "kind" && key !== "synthetic" && key !== "sessionId" && key !== "occurredAt" && key !== "variant");
    if (extra.length) return { ok: false, error: "unexpected_form_fields" };
    return { ok: true, request: { kind: "form", synthetic: record.synthetic === true } };
  }
  const eventType = String(record.eventType || record.type || "").toUpperCase();
  if (!(EVENT_TYPES as readonly string[]).includes(eventType) || eventType === "PAID_COMMITMENT") return { ok: false, error: "unsupported_event" };
  return { ok: true, request: { kind: "event", synthetic: record.synthetic === true } };
}

export async function POST(request: Request, context: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = await context.params;
  if (experimentId !== ALLOWED_EXPERIMENT_ID) return json({ error: "unknown_experiment" }, 404);
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: "payload_too_large" }, 413);
  const now = Date.now();
  if (!windowStart || now - windowStart >= WINDOW_MS) {
    windowStart = now;
    acceptedInWindow = 0;
  }
  if (acceptedInWindow >= RATE_LIMIT) return json({ error: "rate_limited" }, 429);
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  acceptedInWindow += 1;
  received.push({ at: now, synthetic: parsed.request.synthetic === true, kind: parsed.request.kind });
  return json({ accepted: 1, duplicates: 0 }, 202);
}
