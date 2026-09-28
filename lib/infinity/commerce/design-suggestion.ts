import { createHash } from "node:crypto";
import { evaluateMerchandiseIpSafety } from "./ip-safety";
import type { DesignSuggestion } from "./types";

const store = new Map<string, DesignSuggestion>();

function suggestionId(ventureId: string, text: string): string {
  return `dsug_${createHash("sha256").update(`${ventureId}:${text.trim().toLowerCase()}`).digest("hex").slice(0, 20)}`;
}

export function receiveDesignSuggestion(input: {
  venture_id: string;
  suggestion_text: string;
  submitter_name?: string | null;
  submitter_email?: string | null;
  product_preference?: string | null;
  color_preference?: string | null;
  notification_consent?: boolean;
  now?: string;
}): DesignSuggestion {
  const text = input.suggestion_text.trim();
  const id = suggestionId(input.venture_id, text);
  const existing = store.get(id);
  if (existing) return { ...existing, status: "DUPLICATE" };
  const ip = evaluateMerchandiseIpSafety(text);
  const suggestion: DesignSuggestion = {
    id,
    venture_id: input.venture_id,
    submitted_at: input.now ?? new Date().toISOString(),
    suggestion_text: text,
    submitter_name: input.submitter_name ?? null,
    submitter_email: input.submitter_email ?? null,
    product_preference: input.product_preference ?? null,
    color_preference: input.color_preference ?? null,
    notification_consent: input.notification_consent === true,
    source: "STOREFRONT",
    status: ip.decision === "BLOCK_IP_REVIEW" ? "BLOCK_IP_REVIEW" : "RECEIVED",
    linked_product_opportunity_id: null,
    linked_design_family_id: null,
    linked_commerce_product_id: null,
    is_authorization_to_publish: false,
  };
  store.set(id, suggestion);
  return suggestion;
}

export function listDesignSuggestions(ventureId: string): DesignSuggestion[] {
  return [...store.values()].filter((row) => row.venture_id === ventureId);
}

export function clearDesignSuggestionsForTests(): void {
  store.clear();
}
