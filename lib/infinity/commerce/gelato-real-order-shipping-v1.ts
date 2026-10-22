import { createHash } from "node:crypto";
import type { ClubThrottleShippingAddress } from "./club-throttle-gelato-order-payload.ts";

export const REAL_ORDER_SHIPPING_SNAPSHOT_V1 = "REAL_ORDER_SHIPPING_SNAPSHOT_V1" as const;
export const PROVIDER_SHIPPING_PLACEHOLDER_GUARD_V1 = "PROVIDER_SHIPPING_PLACEHOLDER_GUARD_V1" as const;

const PLACEHOLDER_MARKERS = [
  "redacted",
  "00000",
  "000000",
  "test",
  "placeholder",
  "example",
  "dummy",
  "lorem",
  "fake",
  "sample",
  "xxx",
  "n/a",
  "na",
  "unknown",
  "—",
  "--",
];

export type NormalizedGelatoRecipient = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postCode: string;
  state: string;
  country: string;
  email: string;
  phone?: string;
};

export function normalizeStripeShippingAddress(raw: Record<string, unknown>): ClubThrottleShippingAddress {
  return {
    line1:
      (typeof raw.line1 === "string" && raw.line1) ||
      (typeof raw.addressLine1 === "string" && raw.addressLine1) ||
      null,
    line2:
      (typeof raw.line2 === "string" && raw.line2) ||
      (typeof raw.addressLine2 === "string" && raw.addressLine2) ||
      null,
    city: (typeof raw.city === "string" && raw.city) || null,
    state: (typeof raw.state === "string" && raw.state) || null,
    postal_code:
      (typeof raw.postal_code === "string" && raw.postal_code) ||
      (typeof raw.postCode === "string" && raw.postCode) ||
      null,
    country: (typeof raw.country === "string" && raw.country) || null,
  };
}

export function splitCustomerName(name: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (name ?? "Club Throttle Customer").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "Customer",
    lastName: parts.slice(1).join(" ") || "Order",
  };
}

export function buildGelatoRecipientFromCommerceOrder(input: {
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: Record<string, unknown>;
}): { ok: true; recipient: NormalizedGelatoRecipient } | { ok: false; reason: string } {
  const addr = normalizeStripeShippingAddress(input.shipping_address);
  if (!addr.line1?.trim()) return { ok: false, reason: "MISSING_LINE1" };
  if (!addr.city?.trim()) return { ok: false, reason: "MISSING_CITY" };
  if (!addr.postal_code?.trim()) return { ok: false, reason: "MISSING_POSTAL" };
  if (!addr.country?.trim()) return { ok: false, reason: "MISSING_COUNTRY" };
  const { firstName, lastName } = splitCustomerName(input.customer_name);
  const email = input.customer_email?.trim() || "orders@clubthrottle.com";
  return {
    ok: true,
    recipient: {
      firstName,
      lastName,
      addressLine1: addr.line1.trim(),
      addressLine2: addr.line2?.trim() || undefined,
      city: addr.city.trim(),
      postCode: addr.postal_code.trim(),
      state: (addr.state ?? "").trim() || "OH",
      country: addr.country.trim().toUpperCase(),
      email,
    },
  };
}

function fieldLooksPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return PLACEHOLDER_MARKERS.some((m) => v === m || v.includes(m));
}

export function providerShippingPlaceholderGuardQc(recipient: NormalizedGelatoRecipient): "PASS" | "FAIL" {
  if (recipient.country !== "US") return "FAIL";
  if (fieldLooksPlaceholder(recipient.addressLine1)) return "FAIL";
  if (fieldLooksPlaceholder(recipient.city)) return "FAIL";
  if (fieldLooksPlaceholder(recipient.postCode)) return "FAIL";
  if (fieldLooksPlaceholder(recipient.firstName)) return "FAIL";
  if (fieldLooksPlaceholder(recipient.lastName)) return "FAIL";
  if (fieldLooksPlaceholder(recipient.email)) return "FAIL";
  if (!/^\d{5}(-\d{4})?$/.test(recipient.postCode.trim())) return "FAIL";
  if (!/^[A-Z]{2}$/.test(recipient.state.trim().toUpperCase())) return "FAIL";
  return "PASS";
}

export function realOrderShippingSnapshotQc(input: {
  payment_status: string;
  recipient: NormalizedGelatoRecipient;
}): "PASS" | "FAIL" {
  if (input.payment_status !== "PAID") return "FAIL";
  return providerShippingPlaceholderGuardQc(input.recipient);
}

export function maskRecipientForReport(recipient: NormalizedGelatoRecipient): Record<string, string> {
  const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
  return {
    country: recipient.country,
    state: recipient.state,
    post_code_masked: `${recipient.postCode.slice(0, 2)}***`,
    city_masked: recipient.city.length > 3 ? `${recipient.city.slice(0, 2)}***` : "***",
    street_fingerprint: hash(recipient.addressLine1),
    recipient_fingerprint: hash(`${recipient.firstName}|${recipient.lastName}`),
    email_domain: recipient.email.includes("@") ? recipient.email.split("@")[1]! : "unknown",
  };
}

export function shippingParityFingerprint(recipient: NormalizedGelatoRecipient): string {
  return createHash("sha256")
    .update(
      [
        recipient.country,
        recipient.state,
        recipient.postCode,
        recipient.city,
        recipient.addressLine1,
        recipient.firstName,
        recipient.lastName,
        recipient.email,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

export function gelatoOrderShippingToRecipient(addr: Record<string, unknown>): NormalizedGelatoRecipient | null {
  const line1 = typeof addr.addressLine1 === "string" ? addr.addressLine1 : "";
  if (!line1) return null;
  return {
    firstName: typeof addr.firstName === "string" ? addr.firstName : "",
    lastName: typeof addr.lastName === "string" ? addr.lastName : "",
    addressLine1: line1,
    addressLine2: typeof addr.addressLine2 === "string" ? addr.addressLine2 : undefined,
    city: typeof addr.city === "string" ? addr.city : "",
    postCode: typeof addr.postCode === "string" ? addr.postCode : "",
    state: typeof addr.state === "string" ? addr.state : "",
    country: typeof addr.country === "string" ? addr.country : "",
    email: typeof addr.email === "string" ? addr.email : "",
    phone: typeof addr.phone === "string" ? addr.phone : undefined,
  };
}

function normalizePostal(value: string): string {
  const digits = value.trim().replace(/[^\d]/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : digits;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function shippingComponentParityQc(
  durable: NormalizedGelatoRecipient,
  provider: NormalizedGelatoRecipient | null,
): "PASS" | "FAIL" {
  if (!provider) return "FAIL";
  if (durable.country !== provider.country) return "FAIL";
  if (normalizeText(durable.state) !== normalizeText(provider.state)) return "FAIL";
  if (normalizePostal(durable.postCode) !== normalizePostal(provider.postCode)) return "FAIL";
  if (normalizeText(durable.city) !== normalizeText(provider.city)) return "FAIL";
  if (normalizeText(durable.addressLine1) !== normalizeText(provider.addressLine1)) return "FAIL";
  if (normalizeText(durable.firstName) !== normalizeText(provider.firstName)) return "FAIL";
  if (normalizeText(durable.lastName) !== normalizeText(provider.lastName)) return "FAIL";
  if (normalizeText(durable.email) !== normalizeText(provider.email)) return "FAIL";
  return "PASS";
}

export function draftRealShippingParityQc(
  durable: NormalizedGelatoRecipient,
  provider: NormalizedGelatoRecipient | null,
): "PASS" | "FAIL" {
  return shippingComponentParityQc(durable, provider);
}
