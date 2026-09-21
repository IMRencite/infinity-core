import type { NamedOutboundLoopGate } from "../closed-loop";

export const HUMAN_ATTESTATION_SCOPE = "communication-human-attestation-v7" as const;
export const HUMAN_ATTESTATION_DUE_MS = 4 * 60 * 60 * 1000;
export const HUMAN_ATTESTATION_RENOTIFY_MS = 2 * 60 * 60 * 1000;

export type HumanAttestationStatus = "AWAITING_HUMAN" | "ATTESTED" | "REJECTED" | "EXPIRED" | "BLOCKED_BY_UNAVAILABLE_ACTION_PATH" | "NOT_ACTIONABLE";

export type CommunicationHumanAttestationRequest = {
  id: string;
  kind: "MAILBOX_ROLE_AND_TEST_AUTHORSHIP" | "OFFER_TRUTH";
  owner: "FOUNDER";
  status: HumanAttestationStatus;
  requested_at: string;
  due_at: string;
  renotify_at: string;
  reason: string;
  question: string;
  evidence: Record<string, string | boolean | null>;
  next_action: string;
  escalation_count: number;
  attestation_version: string;
  attested_by: string | null;
  attested_at: string | null;
  answers: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function createHumanAttestationRequests(now: string): CommunicationHumanAttestationRequest[] {
  const due = new Date(Date.parse(now) + HUMAN_ATTESTATION_DUE_MS).toISOString();
  const renotify = new Date(Date.parse(now) + HUMAN_ATTESTATION_RENOTIFY_MS).toISOString();
  return [
    {
      id: "har:mailbox-role-and-test-authorship:v7",
      kind: "MAILBOX_ROLE_AND_TEST_AUTHORSHIP",
      owner: "FOUNDER",
      status: "AWAITING_HUMAN",
      requested_at: now,
      due_at: due,
      renotify_at: renotify,
      reason: "Live Gmail primary is infinitemediaresources@gmail.com; hello@imros.io is not a send-as identity.",
      question: "1) What role should this mailbox have: TEST / PRODUCTION / BOTH / UNKNOWN? Do not pre-select. 2) Did you personally author provider message 1a0be7a9feee5375 as the test prospect message? YES / NO.",
      evidence: {
        gmail_profile: "infinitemediaresources@gmail.com",
        known_send_as: "infinitemediaresources@gmail.com",
        hello_imros_io: "not a Gmail send-as identity",
        thread_id: "1a0af74557b0eb36",
        provider_message_id: "1a0be7a9feee5375",
      },
      next_action: "FOUNDER_ATTEST_VIA_SIGNED_ENDPOINT",
      escalation_count: 0,
      attestation_version: "v7",
      attested_by: null,
      attested_at: null,
      answers: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "har:offer-truth:occupancynpv-offer-truth-v1",
      kind: "OFFER_TRUTH",
      owner: "FOUNDER",
      status: "AWAITING_HUMAN",
      requested_at: now,
      due_at: due,
      renotify_at: renotify,
      reason: "OccupancyNPV offer facts must be founder-attested before recovery send.",
      question: "Are these the current approved OccupancyNPV terms: 3-day free trial, no credit card, no automatic billing, https://occupancynpv.com/pricing ?",
      evidence: {
        offer_truth_version: "occupancynpv-offer-truth-v1",
        free_trial: "3-day free trial",
        credit_card_required: false,
        automatic_billing: false,
        pricing_url: "https://occupancynpv.com/pricing",
      },
      next_action: "FOUNDER_ATTEST_VIA_SIGNED_ENDPOINT",
      escalation_count: 0,
      attestation_version: "v7",
      attested_by: null,
      attested_at: null,
      answers: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function applyHumanAttestationExpiry(request: CommunicationHumanAttestationRequest, now: string): CommunicationHumanAttestationRequest {
  if (request.status === "ATTESTED" || request.status === "REJECTED") return request;
  if (Date.parse(now) < Date.parse(request.due_at)) return request;
  return {
    ...request,
    status: "AWAITING_HUMAN",
    escalation_count: request.escalation_count + 1,
    due_at: new Date(Date.parse(now) + HUMAN_ATTESTATION_DUE_MS).toISOString(),
    renotify_at: new Date(Date.parse(now) + HUMAN_ATTESTATION_RENOTIFY_MS).toISOString(),
    next_action: request.escalation_count + 1 >= 2 ? "RAISE_OPERATIONAL_ALERT_AND_RENOTIFY" : "RENOTIFY_FOUNDER",
    updated_at: now,
  };
}

export function blockHumanRequestsByUnavailableActionPath(
  requests: CommunicationHumanAttestationRequest[],
  now: string,
): CommunicationHumanAttestationRequest[] {
  return requests.map((row) => {
    if (row.status === "ATTESTED" || row.status === "REJECTED") return row;
    return {
      ...row,
      status: "BLOCKED_BY_UNAVAILABLE_ACTION_PATH",
      next_action: "WAIT_FOR_REACHABLE_ATTEST_PATH",
      updated_at: now,
    };
  });
}

export function armHumanAttestationClock(
  requests: CommunicationHumanAttestationRequest[],
  now: string,
): CommunicationHumanAttestationRequest[] {
  const due = new Date(Date.parse(now) + HUMAN_ATTESTATION_DUE_MS).toISOString();
  const renotify = new Date(Date.parse(now) + HUMAN_ATTESTATION_RENOTIFY_MS).toISOString();
  return requests.map((row) => {
    if (row.status === "ATTESTED" || row.status === "REJECTED") return row;
    return {
      ...row,
      status: "AWAITING_HUMAN",
      requested_at: now,
      due_at: due,
      renotify_at: renotify,
      next_action: "FOUNDER_ATTEST_VIA_HQ_SESSION",
      escalation_count: 0,
      updated_at: now,
    };
  });
}

export function evaluateAttestationPathGate(input: {
  endpoint_exists: boolean;
  rejects_unauthenticated: boolean;
  ordinary_prompt_accepted: boolean;
}): NamedOutboundLoopGate {
  const pass = input.endpoint_exists && input.rejects_unauthenticated && !input.ordinary_prompt_accepted;
  return named("AttestationPathGate", pass ? "PASS" : "FAIL", [
    input.endpoint_exists ? "ENDPOINT" : "NO_ENDPOINT",
    input.rejects_unauthenticated ? "AUTH_REQUIRED" : "UNAUTH_ACCEPTED",
  ]);
}

export function evaluateHumanClockStartGate(input: {
  attest_route_serving: boolean;
  externally_reachable: boolean;
  authentication_action_proven: boolean;
  working_link: boolean;
  notification_delivered: boolean;
}): NamedOutboundLoopGate {
  const pass = input.attest_route_serving
    && input.externally_reachable
    && input.authentication_action_proven
    && input.working_link
    && input.notification_delivered;
  return named("HumanClockStartGate", pass ? "PASS" : "FAIL", [
    pass ? "HUMAN_CAN_ACT" : "ACTION_PATH_NOT_READY",
  ]);
}
