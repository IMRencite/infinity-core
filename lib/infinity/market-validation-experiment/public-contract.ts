import { PILOT_FORM_FIELDS } from "./form";

export const PUBLIC_VALIDATION_EVENT_TYPES = [
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

export type PublicValidationEventType = (typeof PUBLIC_VALIDATION_EVENT_TYPES)[number];

export type PublicValidationFormFields = {
  name: string;
  workEmail: string;
  role: string;
  company: string;
  teamSize: string;
  dealFrequency: string;
  preferredPricing: string;
  leaseWorkflow: boolean;
  pilotInterest: boolean;
};

export type PublicValidationEventRequest = {
  kind: "event";
  eventType: PublicValidationEventType;
  variant: "single_offer";
  pricingOption: string | null;
  sessionId: string | null;
  occurredAt: string | null;
  synthetic: boolean;
};

export type PublicValidationFormRequest = {
  kind: "form";
  variant: "single_offer";
  sessionId: string | null;
  occurredAt: string | null;
  synthetic: boolean;
  form: PublicValidationFormFields;
};

export type PublicValidationIngestRequest = PublicValidationEventRequest | PublicValidationFormRequest;

const FORM_KEYS = new Set<string>(PILOT_FORM_FIELDS);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parsePublicValidationIngest(body: unknown): {
  ok: true;
  request: PublicValidationIngestRequest;
} | {
  ok: false;
  error: string;
} {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "invalid_payload" };
  const kind = record.kind === "form" ? "form" : record.kind === "event" || record.type ? "event" : null;
  if (!kind) return { ok: false, error: "invalid_payload" };
  const synthetic = record.synthetic === true;
  const sessionId = typeof record.sessionId === "string" ? record.sessionId : typeof record.prospectKey === "string" ? record.prospectKey : null;
  const occurredAt = typeof record.occurredAt === "string" ? record.occurredAt : null;
  const variant = "single_offer" as const;

  if (kind === "form") {
    const formRaw = asRecord(record.form) ?? record;
    const extra = Object.keys(formRaw).filter(
      (key) =>
        !FORM_KEYS.has(key) &&
        key !== "leaseWorkflow" &&
        key !== "pilotInterest" &&
        key !== "kind" &&
        key !== "synthetic" &&
        key !== "sessionId" &&
        key !== "occurredAt" &&
        key !== "variant",
    );
    if (extra.length) return { ok: false, error: "unexpected_form_fields" };
    return {
      ok: true,
      request: {
        kind: "form",
        variant,
        sessionId,
        occurredAt,
        synthetic,
        form: {
          name: asString(formRaw.name),
          workEmail: asString(formRaw.workEmail),
          role: asString(formRaw.role),
          company: asString(formRaw.company),
          teamSize: asString(formRaw.teamSize),
          dealFrequency: asString(formRaw.dealFrequency),
          preferredPricing: asString(formRaw.preferredPricing),
          leaseWorkflow: asBoolean(formRaw.leaseWorkflow),
          pilotInterest: asBoolean(formRaw.pilotInterest),
        },
      },
    };
  }

  const eventType = String(record.eventType ?? record.type ?? "").toUpperCase();
  if (!(PUBLIC_VALIDATION_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return { ok: false, error: "unsupported_event" };
  }
  if (eventType === "PAID_COMMITMENT") return { ok: false, error: "unsupported_event" };
  return {
    ok: true,
    request: {
      kind: "event",
      eventType: eventType as PublicValidationEventType,
      variant,
      pricingOption: typeof record.pricingOption === "string" ? record.pricingOption : typeof record.pricingOptionId === "string" ? record.pricingOptionId : null,
      sessionId,
      occurredAt,
      synthetic,
    },
  };
}
