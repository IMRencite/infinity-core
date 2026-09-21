export const BLACKBOX_PROBE_SUBJECT_PREFIX = "[INFINITY-PROBE" as const;
export const BLACKBOX_PROBE_HEADER = "X-Infinity-Probe" as const;
export const BLACKBOX_PROBE_SLO_MS = 20 * 60 * 1000;

export function isBlackBoxProbeMessage(input: {
  subject?: string | null;
  custom_header?: string | null;
  from?: string | null;
  probe_mailbox?: string | null;
}): boolean {
  if ((input.subject ?? "").startsWith(BLACKBOX_PROBE_SUBJECT_PREFIX)) return true;
  if ((input.custom_header ?? "").toLowerCase().includes("infinity-probe")) return true;
  const from = (input.from ?? "").toLowerCase();
  const probe = (input.probe_mailbox ?? "").toLowerCase();
  return Boolean(from && probe && from.includes(probe));
}

export function classifyBlackBoxProbeTurn() {
  return {
    class: "BLACKBOX_PROBE" as const,
    recovered: true as const,
    clean_eligible: false as const,
    counts_toward_clean: false as const,
  };
}

export function probeSloStatus(input: {
  sent_at: string;
  replied_at: string | null;
  now: string;
  slo_ms?: number;
}): "PASS" | "SLO_MISS" | "IN_FLIGHT" {
  if (input.replied_at) return "PASS";
  const slo = input.slo_ms ?? BLACKBOX_PROBE_SLO_MS;
  return Date.parse(input.now) - Date.parse(input.sent_at) > slo ? "SLO_MISS" : "IN_FLIGHT";
}

export function shouldPageProbe(status: ReturnType<typeof probeSloStatus>, armed: boolean): boolean {
  return armed && status === "SLO_MISS";
}
