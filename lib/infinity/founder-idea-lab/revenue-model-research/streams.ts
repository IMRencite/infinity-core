import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type { FounderResearchPacket } from "../research-packet";
import type { VentureContext } from "../comparable-economics/qualify";
import { primaryRevenueModelType } from "./classify";
import type { ExtractedMoneyObservation } from "./types";
import type { RevenueModelComparable, RevenueModelProvenance, RevenueStream, RevenueStreamCadence } from "./types";

function rangeFromObs(obs: ExtractedMoneyObservation[]): EconomicRange {
  const amounts = obs.map((item) => item.amount).filter((item): item is number => item != null);
  if (!amounts.length) return unknownRange();
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return { low, high, base: (low + high) / 2 };
}

function stream(input: Omit<RevenueStream, "id"> & { id: string }): RevenueStream {
  return input;
}

export function composeRevenueStreams(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
  comparables: RevenueModelComparable[];
  observations: ExtractedMoneyObservation[];
}): RevenueStream[] {
  const streams: RevenueStream[] = [];
  const monthly = input.observations.filter(
    (item) =>
      item.monthlyRecurringEquivalent != null &&
      item.kind !== "SETUP_FEE" &&
      item.kind !== "CHURN" &&
      item.kind !== "GROSS_MARGIN" &&
      item.kind !== "COMMISSION",
  );
  const setup = input.observations.filter((item) => item.kind === "SETUP_FEE");
  const commission = input.observations.filter((item) => item.kind === "COMMISSION");
  const support = input.comparables.filter((row) => row.revenueModelRole !== "NO").map((row) => row.name);
  const sources = [...new Set(input.packet.findings.flatMap((item) => item.sourceUrls))];
  const provenance: RevenueModelProvenance = monthly.length || setup.length ? "COMPARABLE_MODELED" : "UNKNOWN";
  const text = input.packet.findings.map((item) => item.claim).join(" ");

  if (monthly.length) {
    const perUser = monthly.some((item) => item.perUser);
    const perSeat = monthly.some((item) => item.perSeat);
    const perLocation = monthly.some((item) => item.perLocation);
    const type = perUser ? "PER_USER" : perSeat ? "PER_SEAT" : perLocation ? "PER_LOCATION" : primaryRevenueModelType(text);
    streams.push(
      stream({
        id: "recurring-platform-subscription",
        name: "Recurring platform subscription",
        type,
        description: "Recurring platform or package subscription.",
        recurringOrOneTime: "RECURRING",
        priceRange: rangeFromObs(monthly),
        unit: perUser
          ? "usd_per_user_month"
          : perSeat
            ? "usd_per_seat_month"
            : perLocation
              ? "usd_per_location_month"
              : "usd_per_month",
        billingCadence: "MONTHLY",
        targetCustomer: input.context.targetCustomer,
        comparableSupport: support,
        sourceRefs: sources,
        sourceClass: "UNKNOWN",
        confidence: monthly.length >= 2 ? "MEDIUM" : "LOW",
        provenance,
      }),
    );
  }

  if (setup.length) {
    streams.push(
      stream({
        id: "setup-onboarding",
        name: "Setup / onboarding",
        type: "ONE_TIME_IMPLEMENTATION",
        description: "Setup / onboarding / implementation fee.",
        recurringOrOneTime: "ONE_TIME",
        priceRange: rangeFromObs(setup),
        unit: "usd_one_time",
        billingCadence: "ONE_TIME",
        targetCustomer: input.context.targetCustomer,
        comparableSupport: support,
        sourceRefs: sources,
        sourceClass: "UNKNOWN",
        confidence: "MEDIUM",
        provenance,
      }),
    );
  }

  const upsellMentions = ["SEO", "AEO", "content", "premium support", "multi-location", "analytics", "automation", "lead generation"];
  const present = upsellMentions.filter((term) => new RegExp(term, "i").test(text));
  if (present.length) {
    streams.push(
      stream({
        id: "add-on-upsell",
        name: "Add-on / premium upsell",
        type: "FREEMIUM_UPSELL",
        description: `Add-on / upsell streams observed: ${present.join(", ")}.`,
        recurringOrOneTime: "RECURRING",
        priceRange: unknownRange(),
        unit: "usd_per_month",
        billingCadence: "MONTHLY",
        targetCustomer: input.context.targetCustomer,
        comparableSupport: support,
        sourceRefs: sources,
        sourceClass: "UNKNOWN",
        confidence: "LOW",
        provenance: monthly.length ? "COMPARABLE_MODELED" : "UNKNOWN",
      }),
    );
  }

  if (/\bretainer\b|\bmanaged service\b/i.test(text)) {
    streams.push(
      stream({
        id: "managed-service-retainer",
        name: "Managed service retainer",
        type: "MANAGED_SERVICE_RETAINER",
        description: "Managed service or retainer component.",
        recurringOrOneTime: "RECURRING",
        priceRange: unknownRange(),
        unit: "usd_per_month",
        billingCadence: "MONTHLY",
        targetCustomer: input.context.targetCustomer,
        comparableSupport: support,
        sourceRefs: sources,
        sourceClass: "UNKNOWN",
        confidence: "LOW",
        provenance: monthly.length ? "COMPARABLE_MODELED" : "UNKNOWN",
      }),
    );
  }

  if (commission.length) {
    streams.push(
      stream({
        id: "commission",
        name: "Commission / take rate",
        type: "COMMISSION",
        description: "Commission or take-rate stream.",
        recurringOrOneTime: "MIXED",
        priceRange: rangeFromObs(commission),
        unit: "percent",
        billingCadence: "PER_TRANSACTION",
        targetCustomer: input.context.targetCustomer,
        comparableSupport: support,
        sourceRefs: sources,
        sourceClass: "UNKNOWN",
        confidence: "MEDIUM",
        provenance: "COMPARABLE_MODELED",
      }),
    );
  }

  return streams;
}

export function cadenceFromStream(stream: RevenueStream): RevenueStreamCadence {
  return stream.billingCadence;
}
