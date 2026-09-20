import { OCCUPANCYNPV_VENTURE_ID } from "@/lib/infinity/autonomous-sales-execution/contract";
import {
  AUTONOMOUS_LIMITS,
  CANARY_LIMITS,
  DEFAULT_CANARY_VENTURE_ID,
  PRODUCTION_OUTBOUND_POLICY_VERSION,
  type OutboundMode,
} from "./contract";
import type { OutboundChannelFlags, OutboundLimits, ProductionOutboundControl } from "./types";

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseMode(value: string | undefined): OutboundMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "canary") return "CANARY";
  if (normalized === "autonomous") return "AUTONOMOUS";
  if (normalized === "disabled") return "DISABLED";
  return "CANARY";
}

function parseLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function limitsFor(mode: OutboundMode, env: NodeJS.Dict<string>): OutboundLimits {
  const base = mode === "AUTONOMOUS" ? AUTONOMOUS_LIMITS : CANARY_LIMITS;
  return {
    max_sends_per_hour: parseLimit(env.MAX_SENDS_PER_HOUR, base.MAX_SENDS_PER_HOUR),
    max_sends_per_day: parseLimit(env.MAX_SENDS_PER_DAY, base.MAX_SENDS_PER_DAY),
    max_sends_per_venture: parseLimit(env.MAX_SENDS_PER_VENTURE, base.MAX_SENDS_PER_VENTURE),
    max_sends_per_prospect: parseLimit(env.MAX_SENDS_PER_PROSPECT, base.MAX_SENDS_PER_PROSPECT),
    max_followups: parseLimit(env.MAX_FOLLOWUPS, base.MAX_FOLLOWUPS),
  };
}

function defaultChannels(mode: OutboundMode, env: NodeJS.Dict<string>): OutboundChannelFlags {
  return {
    email_enabled: parseBoolean(env.OUTBOUND_EMAIL_ENABLED, mode !== "DISABLED"),
    sms_enabled: parseBoolean(env.OUTBOUND_SMS_ENABLED, false),
    phone_enabled: parseBoolean(env.OUTBOUND_PHONE_ENABLED, false),
    other_channel_enabled: parseBoolean(env.OUTBOUND_OTHER_ENABLED, false),
  };
}

function defaultVentures(env: NodeJS.Dict<string>): Record<string, boolean> {
  const raw = env.OUTBOUND_VENTURE_IDS?.trim();
  const ids = raw ? raw.split(",").map((row) => row.trim()).filter(Boolean) : [DEFAULT_CANARY_VENTURE_ID, OCCUPANCYNPV_VENTURE_ID, "occupancynpv"];
  return Object.fromEntries(ids.map((id) => [id, parseBoolean(env.VENTURE_OUTBOUND_ENABLED, true)]));
}

export function loadProductionOutboundControl(
  env: NodeJS.Dict<string> = process.env,
  overrides: Partial<ProductionOutboundControl> = {},
): ProductionOutboundControl {
  const requested = overrides.requested_mode ?? parseMode(env.OUTBOUND_MODE);
  const autonomy_ready = overrides.autonomy_ready ?? parseBoolean(env.OUTBOUND_AUTONOMY_READY, false);
  const mode: OutboundMode = requested === "AUTONOMOUS" && !autonomy_ready ? "CANARY" : requested;
  return {
    mode,
    requested_mode: requested,
    kill_switch: overrides.kill_switch ?? parseBoolean(env.GLOBAL_OUTBOUND_KILL_SWITCH, false),
    venture_outbound_enabled: overrides.venture_outbound_enabled ?? defaultVentures(env),
    channels: overrides.channels ?? defaultChannels(mode, env),
    limits: overrides.limits ?? limitsFor(mode, env),
    autonomy_ready,
    policy_version: PRODUCTION_OUTBOUND_POLICY_VERSION,
  };
}

export function channelEnabled(control: ProductionOutboundControl, channel: keyof OutboundChannelFlags | string): boolean {
  if (channel === "email") return control.channels.email_enabled;
  if (channel === "sms") return control.channels.sms_enabled;
  if (channel === "phone") return control.channels.phone_enabled;
  if (channel === "other") return control.channels.other_channel_enabled;
  return false;
}

export function ventureOutboundEnabled(control: ProductionOutboundControl, ventureId: string): boolean {
  if (control.venture_outbound_enabled[ventureId] === true) return true;
  return Object.entries(control.venture_outbound_enabled).some(([id, enabled]) => enabled && (ventureId === id || ventureId.endsWith(id)));
}

export function emptyOutboundUsage(now: string) {
  const date = new Date(now);
  const hour = `${date.toISOString().slice(0, 13)}`;
  const day = date.toISOString().slice(0, 10);
  return {
    hour_key: hour,
    day_key: day,
    hourly: 0,
    daily: 0,
    by_venture: {} as Record<string, number>,
    by_channel: {} as Record<string, number>,
    by_prospect: {} as Record<string, number>,
    followups: 0,
  };
}

export function rolloverUsage(usage: ReturnType<typeof emptyOutboundUsage>, now: string): ReturnType<typeof emptyOutboundUsage> {
  const next = emptyOutboundUsage(now);
  return {
    ...next,
    daily: usage.day_key === next.day_key ? usage.daily : 0,
    hourly: usage.hour_key === next.hour_key ? usage.hourly : 0,
    by_venture: usage.day_key === next.day_key ? { ...usage.by_venture } : {},
    by_channel: usage.day_key === next.day_key ? { ...usage.by_channel } : {},
    by_prospect: usage.day_key === next.day_key ? { ...usage.by_prospect } : {},
    followups: usage.day_key === next.day_key ? usage.followups : 0,
  };
}
