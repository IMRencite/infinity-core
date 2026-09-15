import { isSuppressed } from "@/lib/infinity/growth-engine/suppression";

export function salesOutreachBlocked(input: {
  email?: string;
  ventureId?: string;
  campaignId?: string;
  prospectId?: string;
  unsubscribed?: boolean;
  bounced?: boolean;
}): boolean {
  if (input.unsubscribed || input.bounced) return true;
  if (input.email && isSuppressed({
    email: input.email,
    ventureId: input.ventureId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  })) return true;
  return false;
}

export function duplicateSalesActionBlocked(input: {
  same_target: boolean;
  same_kind: boolean;
  already_executed: boolean;
  beyond_policy?: boolean;
}): boolean {
  if (input.beyond_policy) return true;
  return input.same_target && input.same_kind && input.already_executed;
}
