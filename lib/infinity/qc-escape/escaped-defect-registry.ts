import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { durableLocalPersistEnabled } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import {
  confidenceAfterEscape,
  requiredVerificationForEscapeCount,
  type EscapedDefectRecord,
  type QcConfidence,
} from "./contract";

export const ESCAPED_DEFECT_REGISTRY_PATH = ".infinity/qc-escape/escaped-defects.json" as const;

const memory: EscapedDefectRecord[] = [];

export function resetEscapedDefectRegistryForTests(): void {
  memory.length = 0;
}

function hydrate(): EscapedDefectRecord[] {
  if (memory.length) return memory;
  if (!existsSync(ESCAPED_DEFECT_REGISTRY_PATH)) return memory;
  try {
    const parsed = JSON.parse(readFileSync(ESCAPED_DEFECT_REGISTRY_PATH, "utf8")) as { defects?: EscapedDefectRecord[] };
    memory.push(...(parsed.defects ?? []));
  } catch {
    /* ignore */
  }
  return memory;
}

function persist(rows: EscapedDefectRecord[]): void {
  if (!durableLocalPersistEnabled()) return;
  mkdirSync(dirname(ESCAPED_DEFECT_REGISTRY_PATH), { recursive: true });
  writeFileSync(ESCAPED_DEFECT_REGISTRY_PATH, `${JSON.stringify({ contract: "EscapedDefectRegistry", defects: rows }, null, 2)}\n`);
}

export function recordEscapedDefect(input: Omit<EscapedDefectRecord, "escape_count_in_family" | "required_verification" | "confidence_after_escape" | "resolved"> & {
  confidence_after_escape?: QcConfidence;
}): EscapedDefectRecord {
  const rows = hydrate();
  const family = rows.filter((row) => row.gate_that_should_have_caught === input.gate_that_should_have_caught);
  const escape_count_in_family = family.length + 1;
  const record: EscapedDefectRecord = {
    ...input,
    confidence_after_escape: input.confidence_after_escape ?? confidenceAfterEscape("HIGH", true),
    escape_count_in_family,
    required_verification: requiredVerificationForEscapeCount(escape_count_in_family),
    resolved: input.defect_fixed && input.gate_strengthened,
  };
  const existing = rows.findIndex((row) => row.escape_id === record.escape_id);
  if (existing >= 0) rows[existing] = record;
  else rows.push(record);
  persist(rows);
  return record;
}

export function listEscapedDefects(): EscapedDefectRecord[] {
  return [...hydrate()];
}

export function markEscapedDefectResolved(escapeId: string, input: { defect_fixed: boolean; gate_strengthened: boolean }): EscapedDefectRecord | null {
  const rows = hydrate();
  const row = rows.find((item) => item.escape_id === escapeId);
  if (!row) return null;
  row.defect_fixed = input.defect_fixed;
  row.gate_strengthened = input.gate_strengthened;
  row.resolved = input.defect_fixed && input.gate_strengthened;
  persist(rows);
  return row;
}

export function gateConfidence(gate: string): QcConfidence {
  const open = listEscapedDefects().filter((row) => row.gate_that_should_have_caught === gate && !row.resolved);
  if (open.length) return "LOW";
  const closed = listEscapedDefects().filter((row) => row.gate_that_should_have_caught === gate && row.resolved);
  return closed.length ? "MEDIUM" : "HIGH";
}

export const TAXONOMY_HOVER_CONTRAST_ESCAPE = recordEscapedDefect({
  escape_id: "escape:taxonomy-hover-contrast-2026-09-17",
  discovered_at: "2026-09-17T11:43:00.000Z",
  discovered_by: "HUMAN",
  defect_class: [
    "TAXONOMY_HOVER_CONTRAST_ESCAPE",
    "INTERACTIVE_STATE_CONTRAST_ESCAPE",
    "RENDERED_VISUAL_QC_ESCAPE",
  ],
  surface: "occupancynpv.com/blog taxonomy chips",
  live_url: "https://occupancynpv.com/blog/tag/interest-rates/",
  gates_that_passed: [
    "BlogTaxonomyContrastGate",
    "BlogTaxonomyChipGate",
    "BlogRenderedVisualQualityGate",
    "BlogEditorialDesignGate",
  ],
  gate_that_should_have_caught: "BlogTaxonomyContrastGate",
  miss_reason:
    "SOURCE_SELECTOR_EXISTENCE_ONLY: gates asserted .onpv-taxonomy-chip:hover exists in CSS, did not compute hover/visited cascade contrast, did not render hover, and :visited{color:#10232c} after :hover{background:#10232c} made visited hover ink match the hover fill.",
  defect_fixed: false,
  gate_strengthened: false,
});

export const TAXONOMY_CREATIVE_QUALITY_ESCAPE = recordEscapedDefect({
  escape_id: "escape:taxonomy-archive-creative-quality-2026-09-17",
  discovered_at: "2026-09-17T11:43:00.000Z",
  discovered_by: "HUMAN",
  defect_class: [
    "CREATIVE_QUALITY_ESCAPE",
    "GENERIC_TEMPLATE_ESCAPE",
    "TEXT_CLIP_ESCAPE",
    "RENDERED_VISUAL_QC_ESCAPE",
  ],
  surface: "occupancynpv.com/blog tag and category archive heroes",
  live_url: "https://occupancynpv.com/blog/tag/interest-rates/",
  gates_that_passed: [
    "CreativeUniquenessGate",
    "CreativeOveruseGate",
    "DesignCoreCreativeQualityGate",
    "BlogRenderedVisualQualityGate",
  ],
  gate_that_should_have_caught: "DesignCoreCreativeQualityGate",
  miss_reason:
    "CALLER_SUPPLIED_BOOLEANS_AND_PATH_FINGERPRINTS: quality gate accepted unique:true/textArtifacts:false without inspecting SVG markup; uniqueness hashed file path + topic, not geometry. Four archive SVGs shared one line-chart path with edge labels that object-fit:cover clipped (RATES → ENTES).",
  defect_fixed: false,
  gate_strengthened: false,
});

export const DELIVERED_EMAIL_SEMANTIC_ESCAPE = recordEscapedDefect({
  escape_id: "escape:occupancynpv-delivered-email-semantic-2026-09-18",
  discovered_at: "2026-09-18T02:49:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "DELIVERED_EMAIL_SEMANTICALLY_INVALID",
    "EMPTY_OUTBOUND_BODY",
    "INBOUND_BODY_PARSE_FAILURE",
    "MESSAGE_ROLE_CONFUSION",
    "FALSE_OPT_OUT",
    "OPT_OUT_ECHO",
    "MULTI_TURN_CONTEXT_FAILURE",
  ],
  surface: "OccupancyNPV Gmail thread 1a0af74557b0eb36",
  gates_that_passed: [
    "ProductionOutboundClosedLoopGate",
    "InboundReplyIngestionGate",
    "ProductionOptOutClassificationGate",
  ],
  gate_that_should_have_caught: "ProductionOutboundClosedLoopGate",
  miss_reason:
    "TRANSPORT_ONLY_CLOSED_LOOP: gate accepted provider send/delivery/STOP classification without verifying parsed inbound body, sender role, generated response content, or delivered Gmail body. Infinity-authored empty and STOP messages were treated as conversation success; the prospect's second-turn lease-vs-alternative question was never answered.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const ALWAYS_ON_RUNTIME_NOT_SCHEDULED_ESCAPE = recordEscapedDefect({
  escape_id: "escape:always-on-runtime-not-scheduled-2026-09-18",
  discovered_at: "2026-09-18T03:52:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: ["ALWAYS_ON_RUNTIME_NOT_ACTUALLY_SCHEDULED"],
  surface: "OccupancyNPV inbound communication runtime",
  gates_that_passed: ["CommunicationRuntimeAlwaysOnGate"],
  gate_that_should_have_caught: "AlwaysOnAutonomyTruthGate",
  miss_reason:
    "MANUAL_TICK_DESCRIBED_AS_ALWAYS_ON: hourly Vercel cron observed Gmail but semantic reply required Cursor/manual allow_live_semantic_reply. CommunicationRuntimeAlwaysOnGate treated schedulerBound+tickInvoked as PASS without a production-cron send, durable job, or autonomy-truth evidence.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const ROBOTIC_CUSTOMER_FACING_LANGUAGE_ESCAPE = recordEscapedDefect({
  escape_id: "escape:robotic-customer-facing-language-2026-09-18",
  discovered_at: "2026-09-18T09:05:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: ["ROBOTIC_CUSTOMER_FACING_LANGUAGE"],
  surface: "OccupancyNPV T4 live reply 1a0b3befb327cbcb",
  live_url: "https://occupancynpv.com/pricing",
  gates_that_passed: [
    "ResponseContentQualityGate",
    "OfferDrivenSalesAdvancementGate",
    "AlwaysOnAutonomyTruthGate",
  ],
  gate_that_should_have_caught: "NaturalSalesConversationGate",
  miss_reason:
    "Internal terms appeared in an otherwise correct sales response. T4 used the real 3-day trial offer but said 'verified path' and 'DealWorkspace'.",
  root_cause: "Composer optimized for offer correctness and internal stage labels, not customer-facing language.",
  gate_gap: "No NaturalSalesConversationGate or phrase detector before provider send.",
  fix: "NaturalSalesConversationGate + rewrite (max 2) + VentureCustomerVocabulary + SalesConversationVoiceScore. Do not send on jargon or robotic phrasing.",
  regression: "Natural-language fixtures 1-10 and NaturalSalesConversationGate on live compose.",
  production_proof: "T4 body 1a0b3befb327cbcb is historical. Next live send must pass NaturalSalesConversationGate.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const PACING_WINDOW_MISREAD_ESCAPE = recordEscapedDefect({
  escape_id: "escape:pacing-window-misread-as-dropped-always-on-2026-09-18",
  discovered_at: "2026-09-18T08:57:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: ["PACING_WINDOW_MISREAD_AS_DROPPED_ALWAYS_ON_INBOUND"],
  surface: "Founder HQ communication scheduler",
  gates_that_passed: ["AlwaysOnAutonomyTruthGate", "CommunicationRuntimeCronHealthGate"],
  gate_that_should_have_caught: "PacingStateVisibilityGate",
  miss_reason:
    "T4 job was WAITING until eligible_at 08:58:31Z. The 08:55 cron correctly did not send. HQ showed a generic waiting job, so healthy pacing looked like a dropped always-on inbound.",
  root_cause: "Job state overloaded generic WAITING. HQ did not show eligible_at, time remaining, or next expected cron.",
  gate_gap: "No WAITING_PACING display state. Paced wait could be read as DEGRADED or dropped.",
  fix: "WAITING_PACING job state + HQ card: Created At, Eligible At, Time Remaining, Next Expected Cron, reason Natural response pacing. Healthy wait is not FAILED.",
  regression: "PacingStateVisibilityGate + HQ waiting-pacing fixtures.",
  production_proof: "T4 delay 8 minutes then SENT at 09:00:31Z. Pacing preserved.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const ACTIONABLE_INBOUND_STRANDED_ESCAPE = recordEscapedDefect({
  escape_id: "escape:actionable-inbound-stranded-while-scheduler-healthy-2026-09-18",
  discovered_at: "2026-09-18T22:28:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "ACTIONABLE_INBOUND_STRANDED_WHILE_SCHEDULER_HEALTHY",
    "THREAD_LATEST_MESSAGE_SELECTION_FAILURE",
    "STALE_SUPPRESSION_BLOCKED_VALID_REPLY",
    "ELIGIBLE_JOB_NOT_CLAIMED",
  ],
  surface: "OccupancyNPV thread 1a0af74557b0eb36 message 1a0b41fe029e3ceb",
  gates_that_passed: ["CommunicationRuntimeCronHealthGate"],
  gate_that_should_have_caught: "BusinessLoopHealthGate",
  miss_reason:
    "Prospect asked for a two-lease example at 2026-09-18 06:46:20-0400. Same-mailbox Gmail snippet still contained Infinity copy, so classifyMessageRole labeled the inbound OUTBOUND. Scheduler later reported HEALTHY while the message had no job and an earlier READY job sat past eligible_at.",
  root_cause:
    "Role used snippet plus quoted history. Observer selected the previous prospect inbound. False Infinity STOP 1a0b254b39f5c645 still looked ACTIVE. Tick executed only the current observation job, and sent_keys could no-op a READY job without a provider id.",
  gate_gap:
    "No LiveMessageRoleDirectionGate on visible body. No BusinessLoopHealthGate separate from cron health. No EligibleJobClaimGate for overdue READY jobs.",
  fix:
    "Visible-body role, latest unresolved prospect selection, ignore known false Infinity STOP, claim every unresolved READY job, refuse thread-level sent-key false positives, HQ business-loop DEGRADED when SLA is missed.",
  regression:
    "Missed-inbound incident fixtures, GmailLatestMessageSelectionGate, ActionableInboundSLAGate, StuckActionableInboundGate, two-lease consultative compose.",
  production_proof:
    "Cursor must not send. Vercel Cron must discover 1a0b41fe029e3ceb and deliver a consultative reply.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING_ESCAPE = recordEscapedDefect({
  escape_id: "escape:mailbox-watch-blind-while-cron-ticking-2026-09-19",
  discovered_at: "2026-09-19T01:15:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "MAILBOX_WATCH_BLIND_WHILE_CRON_TICKING",
    "GMAIL_ENV_INLINED_POST_DEPLOY",
  ],
  surface: "infinity-runtime /api/runtime/communication-tick",
  gates_that_passed: ["CommunicationRuntimeSchedulerPersistenceGate"],
  gate_that_should_have_caught: "AlwaysOnMailboxWatchGate",
  miss_reason:
    "Vercel Cron kept ticking every 5 minutes after isolated deploys, but Turbopack inlined empty GMAIL_* values so token exchange failed GRANT:NOT_CONFIGURED. last_gmail_check_at stayed fresh, so HQ could look like it was watching while inbound was actually unread. Founder had to prompt Cursor to notice unanswered mail.",
  root_cause:
    "Build-time process.env.GMAIL_* inlining plus Object.keys(process.env) still seeing the inlined bag. Cron health used last_gmail_check_at as proof of mailbox watch even when the check was GRANT-blind.",
  gate_gap:
    "No AlwaysOnMailboxWatchGate requiring token_exchange and no GRANT:NOT_CONFIGURED. No runtime-only env read that Turbopack cannot inline.",
  fix:
    "Function-constructor live env bag, force-dynamic nodejs communication-tick, AlwaysOnMailboxWatchGate FAIL on GRANT/stale/no token, HQ watching only when that gate PASSes.",
  regression:
    "AlwaysOnMailboxWatchGate fixtures, mailbox-blind AlwaysOn FAIL, credential runtimeEnv reads stubbed process.env after Function path.",
  production_proof:
    "Cursor must not send or manually tick. Vercel Cron must keep last_gmail_check_at fresh with token_exchange true and last_error none.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE_ESCAPE = recordEscapedDefect({
  escape_id: "escape:cron-runtime-environment-visibility-divergence-2026-09-19",
  discovered_at: "2026-09-19T01:15:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "CRON_RUNTIME_ENVIRONMENT_VISIBILITY_DIVERGENCE",
    "GMAIL_ENV_INLINED_POST_DEPLOY",
    "GMAIL_CREDENTIAL_READ_ORDER_RACE",
  ],
  surface: "infinity-runtime Vercel Cron /api/runtime/communication-tick",
  gates_that_passed: ["AlwaysOnMailboxWatchGate"],
  gate_that_should_have_caught: "CronCredentialVisibilityStabilityGate",
  miss_reason:
    "HTTP operating-state could see Gmail env while Vercel Cron intermittently reported GRANT:NOT_CONFIGURED. One recovered cron was treated as credential health. Later the same cron request saw PROCESS_ENV after token exchange had already failed.",
  root_cause:
    "Token exchange independently reread Gmail material at operation time. Cron request: early exchange saw empty/stale material (GRANT:NOT_CONFIGURED), then a later readGmailRuntimeConfig in the same invocation reported PROCESS_ENV fingerprint 2c60da8a2c79.",
  gate_gap:
    "No GmailInvocationContext. No hydration barrier before exchange. No same-invocation fingerprint parity. Token exchange and observe each discovered credentials independently.",
  fix:
    "Resolve Gmail credentials once at communication-tick start into GmailInvocationContext, validate, attest, then inject the same object through observe, token exchange, inbound read, job execution, and send.",
  regression:
    "gmail-runtime-config-stability-v1, environment parity fingerprints, conflict gate, startup grace, consecutive cron reset.",
  production_proof:
    "Five automatic VERCEL_CRON ticks with matching fingerprint 2c60da8a2c79 and no GRANT/NOT_CONFIGURED. Cursor must not tick.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const SECOND_ISOLATE_HEALTH_STATE_OVERWRITE_ESCAPE = recordEscapedDefect({
  escape_id: "escape:second-isolate-health-state-overwrite-2026-09-19",
  discovered_at: "2026-09-19T06:40:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "SECOND_ISOLATE_HEALTH_STATE_OVERWRITE",
    "STALE_PARTIAL_CREDENTIAL_PERSIST",
    "SHARED_HEALTH_ROW_MUTATION",
  ],
  surface: "infinity-runtime Vercel Cron /api/runtime/communication-tick",
  gates_that_passed: ["GmailConfigHydrationGate", "GmailSameInvocationParityGate"],
  gate_that_should_have_caught: "StaleCredentialHealthWriterGate",
  miss_reason:
    "A hydrated automatic cron exchanged tokens successfully, then a later isolate persisted a partial or failed credential-health payload over the same shared scheduler row. Consecutive healthy cron reset to 0/5.",
  root_cause:
    "Multiple isolates mutated one CommunicationSchedulerState row. persistCommunicationSchedulerState last-writer-won. LEASE_HELD, HTTP operating-state, and partial cron isolates could overwrite last_error, token_exchange, and consecutive_healthy_cron after an authoritative completed cron.",
  gate_gap:
    "No append-only CredentialHealthObservation log. No CredentialHealthProjection. No versioned writes. No deployment-scoped or partial-over-completed reject.",
  fix:
    "Append CredentialHealthObservation, project current health from authoritative completed current-deployment VERCEL_CRON events, reject stale/partial/foreign/HTTP overwrites, increment 5/5 only from completed automatic cron successes.",
  regression:
    "credential-health-projection-v1: second isolate cannot reset, version conflict, partial cannot overwrite HEALTHY, HTTP cannot reset, failed completed cron can reset, 1..5 sequence, post-cron protection.",
  production_proof:
    "Five consecutive automatic VERCEL_CRON observations on the active alias deployment with last_error NONE and no later isolate reset. Cursor must not tick.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED_ESCAPE = recordEscapedDefect({
  escape_id: "escape:repeated-actionable-inbound-not-completed-2026-09-19",
  discovered_at: "2026-09-19T09:00:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED",
    "CONTENT_QUALITY_BLOCKED_NO_RETRY",
    "DISCOVERY_TREATED_AS_COMPLETION",
    "BLOCKED_JOB_EXCLUDED_FROM_BUSINESS_LOOP",
  ],
  surface: "OccupancyNPV thread 1a0af74557b0eb36 message 1a0b78faca76d524",
  gates_that_passed: ["CommunicationRuntimeCronHealthGate", "CronCredentialVisibilityStabilityGate"],
  gate_that_should_have_caught: "ActionableInboundCompletionGate",
  miss_reason:
    "Prospect wrote 'yes give me a real example' at 2026-09-19T02:47:18Z. Cron observed it, created a job, then classified UNKNOWN and blocked the composer. Scheduler stayed HEALTHY for six hours with no provider reply.",
  root_cause:
    "isProspectRequest and the OccupancyNPV composer required 'example' plus 'lease'. The inbound has neither pair. ResponseContentQualityGate failed first-touch copy. Drain skipped BLOCKED. HQ business-loop ignored BLOCKED jobs, so discovery and a processed key looked like success.",
  gate_gap:
    "No CommunicationReconciliationEngine. No InboundCompletionTruthGate separating discovery from provider reply. No InboundWithoutJobGate / ReadyJobDrainGate for incomplete BLOCKED work. No EndToEndCommunicationHealthGate.",
  fix:
    "isExampleRequest + two-lease compose, reconcile actionable Gmail inbounds against provider replies every cron, resume CONTENT_QUALITY_BLOCKED to READY, degrade Business Loop and Always-On until a provider message id exists.",
  regression:
    "communication-reconciliation-v1: latest actionable prospect, BLOCKED resume, completion truth, inbound without job, example quality PASS, always-on FAIL while unresolved.",
  production_proof:
    "Vercel Cron must rediscover 1a0b78faca76d524 and send a provider reply. Cursor must not tick or send.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED_ESCAPE = recordEscapedDefect({
  escape_id: "escape:high-intent-short-reply-not-reliably-advanced-2026-09-19",
  discovered_at: "2026-09-19T12:30:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "HIGH_INTENT_SHORT_REPLY_NOT_RELIABLY_ADVANCED",
    "DIVERGENT_INTENT_CLASSIFIERS",
    "SHORT_REPLY_LOST_CONTEXT",
    "CONTENT_QUALITY_BLOCKED_NO_RECOMPOSE_PATH",
  ],
  surface: "OccupancyNPV thread 1a0af74557b0eb36 message 1a0b8fe61045cbdb",
  gates_that_passed: ["CommunicationRuntimeCronHealthGate"],
  gate_that_should_have_caught: "CanonicalSalesIntentGate",
  miss_reason:
    "Prospect answered the two-lease question with 'Yes i currently have a couple leases im looking to compare' at 2026-09-19T09:27:49Z. classifySalesReply returned UNKNOWN. Composer used first-touch copy. Quality gate failed. Reconciliation retried the same compose for three hours.",
  root_cause:
    "No single canonical intent. Short contextual yes after an example CTA did not inherit ACTIVE_EVALUATION. firstTouchCore failed ResponseContentQualityGate because the inbound contains 'lease'. BLOCKED was retried without a new compose path.",
  gate_gap:
    "No CanonicalSalesIntentClassifier. No ContextualShortReplyGate. No BlockedConversationRecoveryPolicy that recomposes with inherited intent.",
  fix:
    "One classifyCanonicalSalesIntent for all paths, contextual short-reply inheritance, high-intent trial compose, blocked recompose with reset UNKNOWN attempts, delivered-body token parity, outbound authorship from provider ids.",
  regression:
    "canonical-sales-intent-v1: couple-leases ACTIVE_EVALUATION, short yes inherits context, quality PASS, blocked resume, authorship, delivered body.",
  production_proof:
    "Vercel Cron must recover 1a0b8fe61045cbdb. Cursor must not tick. Recovery does not count as a clean reliability turn.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const LIVE_TURN_REPORT_TARGET_MISMATCH_ESCAPE = recordEscapedDefect({
  escape_id: "escape:live-turn-report-target-mismatch-2026-09-20",
  discovered_at: "2026-09-20T04:08:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "LIVE_TURN_REPORT_TARGET_MISMATCH",
    "REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED",
    "ESCALATE_VISIBLE_ON_UNTRIED_JOB",
    "REQUEST_INPUTS_CLASSIFIED_AS_QUESTION",
  ],
  surface: "OccupancyNPV thread 1a0af74557b0eb36 message 1a0badea7b22a70f",
  gates_that_passed: ["CommunicationRuntimeCronHealthGate", "CronCredentialVisibilityStabilityGate"],
  gate_that_should_have_caught: "LiveTurnTargetIdentityGate",
  miss_reason:
    "The prior live reliability report treated couple-leases inbound 1a0b8fe61045cbdb as current. The actual unanswered turn is 'what would you need from me to compare them?' / 1a0badea7b22a70f, still without a provider reply after nine hours.",
  root_cause:
    "No message-specific LiveTurnTargetIdentityGate. classifyCanonicalSalesIntent mapped the request-inputs question to QUESTION. Reconciliation applied blocked-recovery to never-attempted WAITING jobs and set ESCALATE_VISIBLE. Recovery overwrote conversation state to REQUEST_EXAMPLE.",
  gate_gap:
    "No LiveTurnTargetIdentityGate requiring body + message id + timestamp + causal provider reply. No REQUEST_INPUTS compose. Blocked recovery did not recompute intent before repeating ESCALATE_VISIBLE.",
  fix:
    "Identify the exact live-turn target, classify REQUEST_INPUTS, compose a numbers+trial reply, resume only BLOCKED/FAILED jobs, remapped or never-attempted ESCALATE_VISIBLE back to READY, and keep HQ on that exact inbound.",
  regression:
    "live-turn-target-identity-v1: target identity, REQUEST_INPUTS, ESCALATE_VISIBLE never-attempted resume, WAITING not escalated, wrong prior turn rejected.",
  production_proof:
    "Vercel Cron must recover 1a0badea7b22a70f. Cursor must not tick or send. Recovery does not count as a clean reliability turn.",
  defect_fixed: true,
  gate_strengthened: true,
});

export const FIRST_AUTONOMOUS_CONTENT_CANARY_QC_ESCAPE = recordEscapedDefect({
  escape_id: "escape:first-autonomous-content-canary-qc-2026-09-20",
  discovered_at: "2026-09-20T06:40:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "FIRST_AUTONOMOUS_CONTENT_CANARY_QC_ESCAPE",
    "LOW_CONTRAST_TEXT_ESCAPED_RENDER_QC",
    "THIN_RESOURCE_ESCAPED_CONTENT_GATE",
    "ABOVE_FOLD_SEMANTIC_DUPLICATION",
    "PUBLIC_INTERNAL_CONTENT_STRATEGY_LEAK",
    "PUBLIC_PRODUCT_MATURITY_LANGUAGE_LEAK",
    "ASSUMED_RENDER_PASS_WITHOUT_BROWSER_EVIDENCE",
  ],
  surface: "occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  live_url: "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  gates_that_passed: [
    "HumanValueGate",
    "OrganicRenderedQualityGate",
    "ProductionContentCanaryGate",
  ],
  gate_that_should_have_caught: "OrganicRenderedQualityGate",
  miss_reason:
    "Initial HumanValueGate, OrganicRenderedQualityGate, and ProductionContentCanaryGate were marked PASS from live HTML plus shared-shell inference. Founder visual review then found unreadble light-on-light pills, thin coverage, hero duplication, internal strategy copy, and pilot-concept language.",
  root_cause:
    ".pv-hero-photo .pv-hero-copy p{color:#f8fafc} painted every hero paragraph white, including light .pv-eyebrow pills and AnswerFirst cards. The generator wrote a short duplicated hero plus internal/pilot Disclosure. Rendered QC accepted source HTML without viewport screenshots or computed contrast.",
  gate_gap:
    "No HumanResourceDepthGate, ThinContentRiskGate, AboveFoldRedundancyGate, PublicContentInternalLanguageGate, ProductMaturityTruthGate, TextContrastGate, or browser-evidence requirement on OrganicRenderedQualityGate.",
  fix:
    "Paired eyebrow contrast, AnswerFirst label class, rebuilt checklist resource, hardened QC gates, pause-until-repaired-canary publishing.",
  regression:
    "autonomous-content-qc-escape-v2: contrast pairs, thin vs complete checklist, hero duplication, internal/pilot leaks, pause/resume, required browser evidence.",
  production_proof:
    "LIVE occupancynpv.com URL must pass desktop/tablet/mobile Playwright inspection before execute_publish resumes.",
  defect_fixed: false,
  gate_strengthened: true,
});

export const INITIAL_HUMAN_VALUE_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const INITIAL_ORGANIC_RENDERED_QUALITY_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const INITIAL_PRODUCTION_CONTENT_CANARY_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;

export const V2_TEXT_CONTRAST_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const V2_RENDERED_TEXT_VISIBILITY_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const V2_ORGANIC_RENDERED_QUALITY_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const V2_REPAIRED_PRODUCTION_CONTENT_CANARY_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const V2_HUMAN_RESOURCE_DEPTH_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
export const V2_THIN_CONTENT_RISK_GATE = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;

export const SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE = recordEscapedDefect({
  escape_id: "escape:second-autonomous-content-qc-2026-09-20",
  discovered_at: "2026-09-20T08:34:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE",
    "SECOND_LOW_CONTRAST_ESCAPE_AFTER_QC_HARDENING",
    "SECOND_THIN_RESOURCE_ESCAPE_AFTER_DEPTH_GATE",
    "FALSE_ELEMENT_CONTRAST_PASS",
    "FALSE_RESOURCE_DEPTH_PASS",
  ],
  surface: "occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  live_url: "https://occupancynpv.com/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  gates_that_passed: [
    "TextContrastGate",
    "RenderedTextVisibilityGate",
    "OrganicRenderedQualityGate",
    "HumanResourceDepthGate",
    "ThinContentRiskGate",
    "RepairedProductionContentCanaryGate",
  ],
  gate_that_should_have_caught: "ElementLevelContrastGate",
  miss_reason:
    "V2 browser QC sampled twelve non-CTA nodes and treated screenshot file presence as visual PASS. HumanResourceDepthGate and ThinContentRiskGate accepted checklist/section-count booleans. Founder then saw dark CTA text on a navy-panel button and a still-thin resource.",
  root_cause:
    "PrimaryCTA is a.vg-cta. COMMERCIAL_CTA_CSS styled only button.vg-cta. Article-hero and a{color:accent} let dark/gray ink inherit onto the mid-blue button inside .pv-cta-panel. Contrast QC never enumerated buttons. Depth QC never required ACTIONABLE/EXPLAINED coverage.",
  gate_gap:
    "No ScreenshotCapture vs VisualScreenshotInspection split, no element inventory, no effective-background resolver, no deployment-identity check, no IntentCoverageDepthGate, and parent canary trusted child PASS without provenance.",
  fix:
    "Owned a.vg-cta colors on light and dark panels, rebuilt lease-inputs coverage, element-level visual QC, intent-coverage depth, evidence provenance, pause PAUSED_FOR_SECOND_QC_ESCAPE.",
  regression:
    "autonomous-content-qc-escape-v3: dark-on-blue CTA, inherited button color, screenshot-presence-not-pass, stale/preview identity, mention-only depth, table-only body, brand duplication, obsolete pilot CTA, pause/resume.",
  production_proof:
    "LIVE occupancynpv.com URL must pass element-level contrast, visual inspection, deployment identity, and intent coverage before autonomous publishing resumes.",
  defect_fixed: false,
  gate_strengthened: true,
});

export const SECOND_LOW_CONTRAST_ESCAPE_AFTER_QC_HARDENING = SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE;
export const SECOND_THIN_RESOURCE_ESCAPE_AFTER_DEPTH_GATE = SECOND_AUTONOMOUS_CONTENT_QC_ESCAPE;

export const LIVE_FIRST_PATH_STRANDED_AFTER_OBLIGATION_CUTOVER = recordEscapedDefect({
  escape_id: "escape:live-first-path-stranded-after-obligation-cutover-2026-09-20",
  discovered_at: "2026-09-20T15:50:00.000Z",
  discovered_by: "FOUNDER",
  defect_class: [
    "PRODUCTION_RUNS_PRE_CUTOVER_RELEASE",
    "LIVE_FIRST_PATH_STRANDED_AFTER_OBLIGATION_CUTOVER",
    "FOUNDER_LIVE_TEST_READINESS_FALSE_POSITIVE",
    "LEGACY_SEMANTIC_FAILURE",
    "LEGACY_BLOCKED_SINK",
    "CROSS_DOMAIN_BUILD_COUPLING",
    "PROVIDER_MESSAGE_WITHOUT_COMMUNICATION_OBLIGATION",
    "LEGACY_BLOCKED_AFTER_CUTOVER_REPORT",
  ],
  surface: "OccupancyNPV thread 1a0af74557b0eb36 message 1a0be7a9feee5375",
  gates_that_passed: [
    "TestThreadCutoverGate",
    "CommunicationPersistenceGate",
    "CommunicationObligationAgeSLOGate",
    "FaultInjectionGate",
  ],
  gate_that_should_have_caught: "CommunicationSchedulerWorkerDeploymentParityGate",
  miss_reason:
    "READY_FOR_FOUNDER_LIVE_TEST passed from local schema, unit tests, and cutover flags. Production cron deployment dpl_6dtsxZFscVtDGCKYsW8aKBwpZtNj never ran the obligation worker. Inbound 1a0be7a9feee5375 was discovered at 11:05Z, a legacy job was BLOCKED with ESCALATE_VISIBLE, and communication_obligations stayed empty for hours.",
  root_cause:
    "ALWAYS-ON was proven as configuration, not live runtime identity. The cron URL invoked a pre-cutover handler that still owned the test thread with BLOCKED. No heartbeat required the running deployment to expose communication-obligation-cutover-v2.1-always-on. No provider-coverage watchdog compared Gmail prospect messages to Postgres obligations.",
  gate_gap:
    "No CommunicationSchedulerWorkerDeploymentParityGate, CommunicationCutoverRuntimeParityGate, CommunicationRuntimeHeartbeatGate, ProviderInboundCoverageGate, or CommunicationDiscoveryLatencyGate on READY_FOR_FOUNDER_LIVE_TEST.",
  fix:
    "Heartbeats, provider inbound coverage, cutover/runtime deployment parity, recover the exact inbound via the obligation worker with recovered=TRUE, and keep clean turns at 0/3.",
  regression:
    "communication-first-path-stranding-v1: missing obligation, stale heartbeat, old deployment, recovered not clean, Blog-OS isolation.",
  production_proof:
    "Vercel Cron on the cutover handler must recover 1a0be7a9feee5375. Cursor must not send. Recovery is not a clean turn.",
  defect_fixed: false,
  gate_strengthened: true,
});

export const FOUNDER_LIVE_TEST_READINESS_FALSE_POSITIVE = LIVE_FIRST_PATH_STRANDED_AFTER_OBLIGATION_CUTOVER;
export const PREVIOUS_READY_FOR_FOUNDER_LIVE_TEST = { result: "PASS", escaped: "ESCAPED_DEFECT" } as const;
