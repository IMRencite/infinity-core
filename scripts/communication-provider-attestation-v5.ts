import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";
import {
  buildPendingRegisteredMailbox,
  classifyMailboxMismatch,
  configuredExpectedMailbox,
  hashMailboxAddress,
  MAILBOX_HASH_VERSION,
  MAILBOX_NORMALIZATION_VERSION,
  readGmailSendAsIdentities,
  REGISTERED_MAILBOX_SCOPE,
} from "@/lib/infinity/production-outbound/obligation/mailbox-attestation";
import { readProductionProviderIdentity } from "@/lib/infinity/production-outbound/obligation/provider-identity";
import {
  evaluateHistoricalThreadCoverageGateV5,
  HISTORICAL_MESSAGE_SCOPE,
  readGmailThreadSnapshot,
  THREAD_SNAPSHOT_SCOPE,
} from "@/lib/infinity/production-outbound/obligation/thread-snapshot";
import { executeRealMessageShadow, LIVE_SHADOW_SCOPE, shadowPublicRecord } from "@/lib/infinity/production-outbound/obligation/live-shadow";
import { pendingOccupancyNpvOfferAttestation, OFFER_ATTESTATION_SCOPE } from "@/lib/infinity/production-outbound/obligation/offer-attestation";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "@/lib/infinity/production-outbound/obligation/cutover";
import { FOUNDER_TRIAL_INBOUND_TEXT } from "@/lib/infinity/production-outbound/obligation/canary";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnv();
  const now = new Date().toISOString();
  const context = resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
  const profile = await readProductionProviderIdentity({ gmailContext: context });
  const sendAs = await readGmailSendAsIdentities({ gmailContext: context });
  const expected = configuredExpectedMailbox();
  const envSender = process.env.GMAIL_SENDER_EMAIL ?? "";
  const hashes = {
    hash_version: MAILBOX_HASH_VERSION,
    normalization_version: MAILBOX_NORMALIZATION_VERSION,
    profile: profile.email ? hashMailboxAddress(profile.email) : null,
    expected: hashMailboxAddress(expected),
    managed_sender: hashMailboxAddress(INFINITY_MANAGED_SENDER),
    env_sender: envSender ? hashMailboxAddress(envSender) : null,
  };
  const aliasMatch = sendAs.aliases.some((row) => hashMailboxAddress(row.address) === hashes.expected);
  const systemHashes = [
    hashes.profile,
    hashes.managed_sender,
    hashes.env_sender,
    ...sendAs.aliases.map((row) => hashMailboxAddress(row.address)),
  ].filter((row): row is string => Boolean(row));
  const snapshot = await readGmailThreadSnapshot({
    threadId: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    system_hashes: systemHashes,
    gmailContext: context,
  });
  const founder = snapshot.ok ? snapshot.messages.find((row) => row.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID) : null;
  const threadLivesHere = Boolean(founder);
  const mismatch = profile.ok && hashes.profile
    ? classifyMailboxMismatch({
      profile_hash: hashes.profile,
      expected_hash: hashes.expected,
      expected_is_alias: aliasMatch,
      hashes_equal_under_same_algorithm: hashes.profile === hashes.expected,
      thread_lives_in_profile_mailbox: threadLivesHere,
    })
    : "UNRESOLVED";
  const registered = profile.email
    ? buildPendingRegisteredMailbox({
      now,
      primary_address: profile.email,
      alias_addresses: sendAs.aliases.map((row) => row.address),
      default_send_as: sendAs.aliases.find((row) => row.isDefault)?.address ?? null,
      credential_fingerprint: profile.credential_fingerprint,
    })
    : null;
  const shadow = executeRealMessageShadow({
    provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    visible_body: FOUNDER_TRIAL_INBOUND_TEXT,
    authorship: "PROSPECT",
    prior_infinity_outbound_count: snapshot.ok
      ? snapshot.messages.filter((row) => row.classification === "SYSTEM").length
      : 4,
    rfc_message_id: founder?.rfc_message_id ?? null,
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    now,
  });
  const pricing = await fetch("https://occupancynpv.com/pricing", { method: "HEAD", redirect: "follow" }).catch(() => null);
  const pricingLive = Boolean(pricing && pricing.ok);
  const coverage = snapshot.ok ? evaluateHistoricalThreadCoverageGateV5(snapshot.messages) : { gate: "HistoricalThreadCoverageGate", result: "FAIL" as const, reasons: ["SNAPSHOT_FAILED"] };
  const privateDir = join(process.cwd(), ".infinity", "communication-v5-private");
  mkdirSync(privateDir, { recursive: true });
  writeFileSync(join(privateDir, "mailbox-attestation.json"), `${JSON.stringify({
    now,
    profile_email: profile.email,
    expected,
    managed_sender: INFINITY_MANAGED_SENDER,
    env_sender: envSender || null,
    send_as: sendAs,
    hashes,
    mismatch,
    founder_from_hash: founder?.from_hash ?? null,
    founder_to_hash: founder?.to_hash ?? null,
  }, null, 2)}\n`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await client.from("cloud_runtime_state").upsert({
      scope: REGISTERED_MAILBOX_SCOPE,
      version: 1,
      instance_id: "communication-registered-mailbox",
      payload: { registered, mismatch, hashes, send_as_scope: sendAs.ok ? "AVAILABLE" : sendAs.reason, MAILBOX_ATTESTATION_REQUIRED: true },
      updated_at: now,
    });
    if (snapshot.ok) {
      await client.from("cloud_runtime_state").upsert({
        scope: THREAD_SNAPSHOT_SCOPE,
        version: 1,
        instance_id: "communication-thread-snapshot",
        payload: {
          thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
          messages: snapshot.messages,
          coverage,
          history_id_watermark: profile.historyId,
          timestamp_watermark: founder?.internal_date ?? "2026-09-20T11:01:41.000Z",
        },
        updated_at: now,
      });
      await client.from("cloud_runtime_state").upsert({
        scope: HISTORICAL_MESSAGE_SCOPE,
        version: 1,
        instance_id: "communication-historical-messages",
        payload: {
          rows: snapshot.messages.filter((row) => row.classification === "SYSTEM").map((row) => ({
            provider_message_id: row.provider_message_id,
            thread_id: row.thread_id,
            role: "SYSTEM",
            sent_at: row.internal_date,
            from_hash: row.from_hash,
            to_hash: row.to_hash,
            rfc_message_id: row.rfc_message_id,
            legacy: true,
            evidence_source: "PROVIDER_HISTORY",
          })),
        },
        updated_at: now,
      });
    }
    await client.from("cloud_runtime_state").upsert({
      scope: LIVE_SHADOW_SCOPE,
      version: 1,
      instance_id: "communication-live-shadow",
      payload: { ...shadowPublicRecord(shadow, now), executed_on: "local_worker_credential_path", promoted_runtime: false },
      updated_at: now,
    });
    await client.from("cloud_runtime_state").upsert({
      scope: OFFER_ATTESTATION_SCOPE,
      version: 1,
      instance_id: "communication-offer-attestation",
      payload: { attestation: pendingOccupancyNpvOfferAttestation(), pricing_live: pricingLive, OFFER_ATTESTATION_REQUIRED: true },
      updated_at: now,
    });
  }
  console.log(JSON.stringify({
    ok: profile.ok && snapshot.ok,
    profile_ok: profile.ok,
    send_as_ok: sendAs.ok,
    send_as_reason: sendAs.reason ?? null,
    alias_count: sendAs.aliases.length,
    hashes,
    mismatch,
    thread_message_count: snapshot.ok ? snapshot.messages.length : 0,
    classifications: snapshot.ok
      ? snapshot.messages.reduce<Record<string, number>>((acc, row) => {
        acc[row.classification] = (acc[row.classification] ?? 0) + 1;
        return acc;
      }, {})
      : {},
    founder_found: Boolean(founder),
    coverage: coverage.result,
    coverage_reasons: coverage.reasons,
    shadow: shadow.LivePromotedRuntimeShadowGate.result,
    shadow_intent: shadow.intent,
    shadow_stage: shadow.stage,
    shadow_hard: shadow.hard,
    shadow_soft: shadow.soft,
    pricing_live: pricingLive,
    MAILBOX_ATTESTATION_REQUIRED: true,
    OFFER_ATTESTATION_REQUIRED: true,
    private_file: join(privateDir, "mailbox-attestation.json"),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
