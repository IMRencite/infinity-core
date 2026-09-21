import { midpointRange, unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type { ExtractedMoneyKind, ExtractedMoneyObservation, ModeledArpu, PriceBoundKind, RevenueSourceClass, RevenueStreamCadence } from "./types";
import { arpuWeightForRole, classifyPriceRole, observationIsCoreMonthly, type PriceRole } from "./price-role";
import {
  canContributeToAddOnPricing,
  canContributeToCorePricing,
  canContributeToManagedServicePricing,
  clusterForRole,
} from "./numeric-contribution";
import {
  classifyPricingCluster,
  selectPricingCluster,
  type PricingCluster,
} from "./pricing-cluster";
import { roundModeledUsd } from "../money-presentation";
import type { VentureContext } from "../comparable-economics/qualify";
import {
  assessSourceIndependence,
  confidenceAfterIndependence,
  type SourceIndependenceInput,
} from "./source-independence";

const VAGUE =
  /\b(hundreds|thousands|tens of thousands|dozens)\b|\b(premium pricing|high-ticket|high ticket|enterprise pricing)\b|\btens of dollars\b|\bhigh.?end pricing\b/i;
const HAS_DOLLAR = /\$\s*[\d]/;
const RANGE = /\$\s*([\d,]+(?:\.\d+)?)\s*(?:[-–—]|to)\s*\$?\s*([\d,]+(?:\.\d+)?)(\+)?/gi;
const MONEY = /\$\s*([\d,]+(?:\.\d+)?)/g;
const COMMISSION = /(\d+(?:\.\d+)?)\s*%\s*(?:commission|take\s*rate|rev(?:enue)?\s*share)/i;
const CHURN = /(\d+(?:\.\d+)?)\s*%\s*(?:monthly\s+)?churn/i;
const MARGIN = /(\d+(?:\.\d+)?)\s*%\s*(?:gross\s+)?margin|\bgross margin\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i;

function parseMoney(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

export function isVagueNonNumericLanguage(claim: string): boolean {
  return VAGUE.test(claim) && !HAS_DOLLAR.test(claim);
}

function windowAround(claim: string, index: number, length: number): string {
  const start = Math.max(0, index - 48);
  const end = Math.min(claim.length, index + length + 28);
  return claim.slice(start, end);
}

function detectCadence(text: string): {
  cadence: RevenueStreamCadence;
  kind: ExtractedMoneyKind;
  perSeat: boolean;
  perUser: boolean;
  perLocation: boolean;
} {
  const perUser = /\/\s*user\b|per\s+user/i.test(text);
  const perSeat = /\/\s*seat\b|per\s+seat/i.test(text);
  const perLocation = /\/\s*location\b|per\s+location/i.test(text);
  if (perUser) return { cadence: "MONTHLY", kind: "PER_USER", perSeat: false, perUser: true, perLocation: false };
  if (perSeat) return { cadence: "MONTHLY", kind: "PER_SEAT", perSeat: true, perUser: false, perLocation: false };
  if (perLocation) return { cadence: "MONTHLY", kind: "PER_LOCATION", perSeat: false, perUser: false, perLocation: true };
  if (/\/\s*year\b|per\s+year|\/\s*yr\b/i.test(text)) {
    return { cadence: "ANNUAL", kind: "ANNUAL_PRICE", perSeat: false, perUser: false, perLocation: false };
  }
  if (/\/\s*mo(?:nth)?\b|per\s+month|\ba month\b/i.test(text)) {
    return { cadence: "MONTHLY", kind: "MONTHLY_PRICE", perSeat: false, perUser: false, perLocation: false };
  }
  if (/\b(setup|onboarding|implementation)\b/i.test(text)) {
    return { cadence: "ONE_TIME", kind: "SETUP_FEE", perSeat: false, perUser: false, perLocation: false };
  }
  if (/\bmonthly\b|\bannually\b|\bannual\b/i.test(text) && /\/\s*year|\bannual/i.test(text)) {
    return { cadence: "ANNUAL", kind: "ANNUAL_PRICE", perSeat: false, perUser: false, perLocation: false };
  }
  if (/\bmonthly\b/i.test(text)) {
    return { cadence: "MONTHLY", kind: "MONTHLY_PRICE", perSeat: false, perUser: false, perLocation: false };
  }
  if (/\busage\b|\bmetered\b|\bper\s+request\b/i.test(text)) {
    return { cadence: "USAGE", kind: "USAGE_FEE", perSeat: false, perUser: false, perLocation: false };
  }
  return { cadence: "UNKNOWN", kind: "RANGE", perSeat: false, perUser: false, perLocation: false };
}

function toMonthly(amount: number, cadence: RevenueStreamCadence, kind: ExtractedMoneyKind): number | null {
  if (kind === "SETUP_FEE" || cadence === "ONE_TIME") return null;
  if (cadence === "ANNUAL" || kind === "ANNUAL_PRICE") return Math.round((amount / 12) * 100) / 100;
  if (cadence === "MONTHLY" || kind === "MONTHLY_PRICE" || kind === "PER_SEAT" || kind === "PER_USER" || kind === "PER_LOCATION") return amount;
  return null;
}

function observation(input: {
  sourceText: string;
  kind: ExtractedMoneyKind;
  low: number | null;
  high: number | null;
  amount: number | null;
  boundKind?: PriceBoundKind;
  upperOpen?: boolean;
  upperAnchor?: number | null;
  unit: ExtractedMoneyObservation["unit"];
  cadence: RevenueStreamCadence;
  perSeat: boolean;
  perUser: boolean;
  perLocation: boolean;
  vagueLanguage?: boolean;
}): ExtractedMoneyObservation {
  const boundKind =
    input.boundKind ??
    (input.low != null && input.high != null && input.low !== input.high ? "CLOSED" : "CLOSED");
  const upperOpen = Boolean(input.upperOpen) || boundKind === "OPEN_HIGH";
  const upperAnchor =
    input.upperAnchor !== undefined
      ? input.upperAnchor
      : upperOpen
        ? input.high
        : boundKind === "UPPER_BOUND"
          ? input.high
          : null;
  const base =
    boundKind === "UPPER_BOUND"
      ? null
      : boundKind === "OPEN_HIGH" || boundKind === "LOWER_BOUND"
        ? input.low ?? input.amount
        : input.amount ?? (input.low != null && input.high != null ? (input.low + input.high) / 2 : input.low ?? input.high);
  const monthly =
    base != null && Number.isFinite(base) ? toMonthly(base, input.cadence, input.kind) : null;
  const annual =
    monthly != null ? monthly * 12 : input.kind === "ANNUAL_PRICE" && base != null ? base : null;
  return {
    sourceText: input.sourceText,
    kind: input.kind,
    amount: base ?? null,
    amountLow: input.low,
    amountHigh: input.high,
    boundKind,
    upperOpen,
    upperAnchor,
    unit: input.unit,
    cadence: input.cadence,
    perSeat: input.perSeat,
    perUser: input.perUser,
    perLocation: input.perLocation,
    vagueLanguage: Boolean(input.vagueLanguage),
    monthlyRecurringEquivalent: monthly,
    annualEquivalent: annual,
    sourceRef: null,
    confidence: input.vagueLanguage ? "NONE" : input.amount != null || input.low != null || input.high != null ? "MEDIUM" : "NONE",
  };
}

export function extractMoneyObservations(claim: string): ExtractedMoneyObservation[] {
  if (!claim.trim()) return [];
  if (isVagueNonNumericLanguage(claim)) {
    return [
      observation({
        sourceText: claim,
        kind: "QUALITATIVE_ONLY",
        low: null,
        high: null,
        amount: null,
        unit: "UNKNOWN",
        cadence: "UNKNOWN",
        perSeat: false,
        perUser: false,
        perLocation: false,
        vagueLanguage: true,
      }),
    ];
  }

  const out: ExtractedMoneyObservation[] = [];
  const consumed = new Set<number>();

  for (const match of claim.matchAll(/\b(?:up to|as much as|capped at|maximum(?: of)?)\s+\$\s*([\d,]+(?:\.\d+)?)/gi)) {
    const high = parseMoney(match[1]!);
    if (!Number.isFinite(high)) continue;
    consumed.add(high);
    const ctx = windowAround(claim, match.index ?? 0, match[0].length);
    const detected = detectCadence(`${match[0]} ${ctx}`);
    out.push(
      observation({
        sourceText: match[0],
        kind: detected.kind === "RANGE" ? "MONTHLY_PRICE" : detected.kind,
        low: null,
        high,
        amount: null,
        boundKind: "UPPER_BOUND",
        unit: "USD",
        cadence: detected.cadence,
        perSeat: detected.perSeat,
        perUser: detected.perUser,
        perLocation: detected.perLocation,
      }),
    );
  }

  for (const match of claim.matchAll(/\b(?:starts? at|from|as low as)\s+\$\s*([\d,]+(?:\.\d+)?)/gi)) {
    const low = parseMoney(match[1]!);
    if (!Number.isFinite(low)) continue;
    consumed.add(low);
    const ctx = windowAround(claim, match.index ?? 0, match[0].length);
    const detected = detectCadence(`${match[0]} ${ctx}`);
    out.push(
      observation({
        sourceText: match[0],
        kind: detected.kind === "RANGE" ? "MONTHLY_PRICE" : detected.kind,
        low,
        high: null,
        amount: low,
        boundKind: "LOWER_BOUND",
        unit: "USD",
        cadence: detected.cadence,
        perSeat: detected.perSeat,
        perUser: detected.perUser,
        perLocation: detected.perLocation,
      }),
    );
  }

  const commission = claim.match(COMMISSION);
  if (commission) {
    const pct = Number(commission[1]);
    if (Number.isFinite(pct)) {
      out.push(
        observation({
          sourceText: commission[0],
          kind: "COMMISSION",
          low: pct,
          high: pct,
          amount: pct,
          unit: "PERCENT",
          cadence: "PER_TRANSACTION",
          perSeat: false,
          perUser: false,
          perLocation: false,
        }),
      );
    }
  }

  const churn = claim.match(CHURN);
  if (churn) {
    const pct = Number(churn[1]);
    if (Number.isFinite(pct)) {
      out.push(
        observation({
          sourceText: churn[0],
          kind: "CHURN",
          low: pct,
          high: pct,
          amount: pct,
          unit: "PERCENT",
          cadence: "MONTHLY",
          perSeat: false,
          perUser: false,
          perLocation: false,
        }),
      );
    }
  }

  const margin = claim.match(MARGIN);
  if (margin) {
    const pct = Number(margin[1] || margin[2]);
    if (Number.isFinite(pct)) {
      out.push(
        observation({
          sourceText: margin[0],
          kind: "GROSS_MARGIN",
          low: pct,
          high: pct,
          amount: pct,
          unit: "PERCENT",
          cadence: "UNKNOWN",
          perSeat: false,
          perUser: false,
          perLocation: false,
        }),
      );
    }
  }

  for (const match of claim.matchAll(RANGE)) {
    const low = parseMoney(match[1]!);
    const high = parseMoney(match[2]!);
    const openHigh = Boolean(match[3]);
    if (!Number.isFinite(low) || !Number.isFinite(high)) continue;
    consumed.add(low);
    consumed.add(high);
    const ctx = windowAround(claim, match.index ?? 0, match[0].length);
    const detected = detectCadence(ctx);
    out.push(
      observation({
        sourceText: match[0],
        kind: detected.kind === "RANGE" && detected.cadence === "UNKNOWN" ? "RANGE" : detected.kind,
        low,
        high,
        amount: openHigh ? low : (low + high) / 2,
        boundKind: openHigh ? "OPEN_HIGH" : "CLOSED",
        upperOpen: openHigh,
        upperAnchor: openHigh ? high : null,
        unit: "USD",
        cadence: detected.cadence,
        perSeat: detected.perSeat,
        perUser: detected.perUser,
        perLocation: detected.perLocation,
      }),
    );
  }

  for (const match of claim.matchAll(MONEY)) {
    const amount = parseMoney(match[1]!);
    if (!Number.isFinite(amount) || consumed.has(amount)) continue;
    const ctx = windowAround(claim, match.index ?? 0, match[0].length);
    const detected = detectCadence(ctx);
    out.push(
      observation({
        sourceText: match[0],
        kind: detected.kind === "RANGE" ? (detected.cadence === "MONTHLY" ? "MONTHLY_PRICE" : detected.kind) : detected.kind,
        low: amount,
        high: amount,
        amount,
        boundKind: "CLOSED",
        unit: "USD",
        cadence: detected.cadence,
        perSeat: detected.perSeat,
        perUser: detected.perUser,
        perLocation: detected.perLocation,
      }),
    );
  }

  return out;
}

export function observationsHaveNumericMoney(observations: ExtractedMoneyObservation[]): boolean {
  return observations.some(
    (item) =>
      !item.vagueLanguage &&
      item.kind !== "QUALITATIVE_ONLY" &&
      ((item.unit === "USD" && item.amount != null) || (item.kind === "COMMISSION" && item.amount != null)),
  );
}

export function claimHasNumericMonetization(claim: string): boolean {
  return observationsHaveNumericMoney(extractMoneyObservations(claim));
}

export function monthlyRangeFromObservations(
  observations: ExtractedMoneyObservation[],
  roles?: PriceRole[],
): EconomicRange {
  const relevant = observations.filter((item, index) => {
    if (
      item.kind === "SETUP_FEE" ||
      item.kind === "QUALITATIVE_ONLY" ||
      item.kind === "CHURN" ||
      item.kind === "GROSS_MARGIN" ||
      item.kind === "COMMISSION"
    ) {
      return false;
    }
    if (item.boundKind === "UPPER_BOUND") return false;
    if (roles && roles[index] && !observationIsCoreMonthly(item, roles[index]!)) return false;
    return item.monthlyRecurringEquivalent != null || item.amountLow != null || item.kind === "MONTHLY_PRICE";
  });
  if (!relevant.length) return unknownRange();
  const lows: number[] = [];
  const highs: number[] = [];
  const bases: number[] = [];
  for (const item of relevant) {
    const low = item.amountLow != null ? toMonthly(item.amountLow, item.cadence, item.kind) : item.monthlyRecurringEquivalent;
    const high =
      item.upperOpen || item.boundKind === "OPEN_HIGH" || item.boundKind === "LOWER_BOUND"
        ? null
        : item.amountHigh != null
          ? toMonthly(item.amountHigh, item.cadence, item.kind)
          : item.monthlyRecurringEquivalent;
    if (low != null) lows.push(low);
    if (high != null) highs.push(high);
    if (item.boundKind === "CLOSED" && item.monthlyRecurringEquivalent != null) bases.push(item.monthlyRecurringEquivalent);
  }
  if (!lows.length && !highs.length && !bases.length) return unknownRange();
  const low = lows.length ? Math.min(...lows) : null;
  const high = highs.length ? Math.max(...highs) : null;
  const base = bases.length ? bases.sort((a, b) => a - b)[Math.floor(bases.length / 2)]! : low;
  return { low, base, high };
}

export type TaggedMoneyObservation = {
  observation: ExtractedMoneyObservation;
  role: PriceRole;
  claim: string;
  sourceUrls: string[];
};

export function taggedMoneyObservationsFromFindings(
  claims: string[],
  context?: VentureContext | null,
): TaggedMoneyObservation[] {
  const tagged: TaggedMoneyObservation[] = [];
  for (const claim of claims) {
    const role = classifyPriceRole(claim, context);
    for (const observation of extractMoneyObservations(claim)) {
      tagged.push({ observation, role, claim, sourceUrls: [] });
    }
  }
  return tagged;
}

function emptyArpu(): ModeledArpu {
  return {
    range: unknownRange(),
    core: unknownRange(),
    managedService: unknownRange(),
    addOn: unknownRange(),
    total: unknownRange(),
    selfServe: unknownRange(),
    managedVertical: unknownRange(),
    observations: [],
    aggregationMethod: "none",
    confidence: "NONE",
    provenance: "UNKNOWN",
    ventureObserved: "UNKNOWN",
    falsePrecision: false,
    recommendedPricingCluster: null,
    selectedPricingCluster: null,
    clusterReason: "No priced observations.",
    clusterConfidence: "NONE",
    sampleCount: 0,
    sourceQuality: "NONE",
    independenceState: "INDEPENDENCE_UNKNOWN",
    qualityReplacementRequired: false,
  };
}

function clusterRange(tagged: TaggedMoneyObservation[], predicate: (item: TaggedMoneyObservation) => boolean): EconomicRange {
  const lows: number[] = [];
  const closedHighs: number[] = [];
  const weighted: Array<{ value: number; weight: number }> = [];
  const relevant = tagged.filter(predicate);
  const direct = relevant.filter((item) => item.role === "DIRECT_COMPARABLE_CORE_PRICE");
  const forBase = direct.length ? direct : relevant;
  for (const { observation } of relevant) {
    const low =
      observation.amountLow != null
        ? toMonthly(observation.amountLow, observation.cadence, observation.kind)
        : observation.monthlyRecurringEquivalent;
    const closedHigh =
      observation.upperOpen || observation.boundKind === "OPEN_HIGH" || observation.boundKind === "UPPER_BOUND"
        ? null
        : observation.amountHigh != null
          ? toMonthly(observation.amountHigh, observation.cadence, observation.kind)
          : observation.boundKind === "CLOSED"
            ? observation.monthlyRecurringEquivalent
            : null;
    if (low != null) lows.push(low);
    if (closedHigh != null) closedHighs.push(closedHigh);
  }
  for (const { observation, role } of forBase) {
    const weight = arpuWeightForRole(role) || 1;
    if (observation.boundKind === "CLOSED" && observation.monthlyRecurringEquivalent != null) {
      weighted.push({ value: observation.monthlyRecurringEquivalent, weight });
    }
  }
  if (!lows.length && !closedHighs.length && !weighted.length) return unknownRange();
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const rawBase =
    totalWeight > 0
      ? weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
      : lows.length
        ? Math.min(...lows)
        : null;
  return {
    low: lows.length ? roundModeledUsd(Math.min(...lows)) : null,
    base: rawBase != null ? roundModeledUsd(rawBase) : null,
    high: closedHighs.length ? roundModeledUsd(Math.max(...closedHighs)) : null,
  };
}

export function aggregateModeledArpu(
  tagged: TaggedMoneyObservation[],
  context?: VentureContext | null,
  sources?: SourceIndependenceInput[],
): ModeledArpu {
  const contributions: ModeledArpu["observations"] = [];
  for (const item of tagged) {
    const cluster = clusterForRole(item.role);
    if (!cluster) continue;
    const core = canContributeToCorePricing(item.observation, item.role, item.claim);
    const managed = canContributeToManagedServicePricing(item.observation, item.role);
    const addOn = canContributeToAddOnPricing(item.observation, item.role);
    if (!core && !managed && !addOn) continue;
    const low =
      item.observation.amountLow != null
        ? toMonthly(item.observation.amountLow, item.observation.cadence, item.observation.kind)
        : item.observation.monthlyRecurringEquivalent;
    const closedHigh =
      item.observation.upperOpen || item.observation.boundKind === "OPEN_HIGH" || item.observation.boundKind === "UPPER_BOUND"
        ? null
        : item.observation.amountHigh != null
          ? toMonthly(item.observation.amountHigh, item.observation.cadence, item.observation.kind)
          : item.observation.boundKind === "CLOSED"
            ? item.observation.monthlyRecurringEquivalent
            : null;
    contributions.push({
      sourceText: item.observation.sourceText,
      role: item.role,
      cluster,
      semanticCluster: classifyPricingCluster(item.claim),
      weight: arpuWeightForRole(item.role),
      monthlyLow: low,
      monthlyHigh: closedHigh,
      boundKind: item.observation.boundKind,
      upperOpen: item.observation.upperOpen,
      contributesToCore: core,
    });
  }
  if (!contributions.length) return emptyArpu();
  const pricedClusters = [
    ...new Set(contributions.map((item) => item.semanticCluster).filter((item): item is PricingCluster => Boolean(item))),
  ];
  const selection = context
    ? selectPricingCluster({ context, pricedClusters })
    : {
        recommendedPricingCluster: null,
        selectedPricingCluster: null,
        reason: "No venture context for cluster selection.",
        confidence: "LOW" as const,
        fallbackUsed: false,
        acceptedEvidence: [],
        rejectedEvidence: pricedClusters,
      };
  const selected = selection.selectedPricingCluster;
  const core = clusterRange(tagged, (item) => {
    if (!canContributeToCorePricing(item.observation, item.role, item.claim)) return false;
    if (!selected) return true;
    return classifyPricingCluster(item.claim, context) === selected;
  });
  const selfServe = clusterRange(tagged, (item) => classifyPricingCluster(item.claim, context) === "SELF_SERVE_SITE_BUILDER");
  const managedVertical = clusterRange(
    tagged,
    (item) =>
      canContributeToManagedServicePricing(item.observation, item.role) ||
      classifyPricingCluster(item.claim, context) === "HYBRID_CMS_MANAGED_SERVICE" ||
      classifyPricingCluster(item.claim, context) === "VERTICAL_CMS_PLATFORM",
  );
  const managedService = clusterRange(tagged, (item) => canContributeToManagedServicePricing(item.observation, item.role));
  const addOn = clusterRange(tagged, (item) => canContributeToAddOnPricing(item.observation, item.role));
  const hasDirect = contributions.some(
    (item) => item.role === "DIRECT_COMPARABLE_CORE_PRICE" && item.contributesToCore && (!selected || item.semanticCluster === selected),
  );
  const openPresent = contributions.some((item) => item.upperOpen && item.contributesToCore && (!selected || item.semanticCluster === selected));
  const coreCount = contributions.filter((item) => item.contributesToCore && (!selected || item.semanticCluster === selected)).length;
  const independence = assessSourceIndependence(sources ?? []);
  const independenceState = sources?.length ? independence.state : "INDEPENDENCE_UNKNOWN";
  const rawConfidence =
    selection.confidence === "LOW"
      ? "LOW"
      : hasDirect && coreCount >= 2 && !openPresent
        ? "MEDIUM"
        : core.base != null || core.low != null
          ? "LOW"
          : "NONE";
  const confidence = sources?.length ? confidenceAfterIndependence(rawConfidence, independence.state) : rawConfidence;
  const hasNumericCore = core.base != null || core.low != null || core.high != null;
  const sourceQuality: ModeledArpu["sourceQuality"] =
    confidence === "NONE" ? "NONE" : confidence === "HIGH" ? "HIGH" : confidence === "MEDIUM" ? "MEDIUM" : "LOW";
  return {
    range: core,
    core,
    managedService,
    addOn,
    total: unknownRange(),
    selfServe,
    managedVertical,
    observations: contributions,
    aggregationMethod: "selected_semantic_cluster_then_role",
    confidence,
    provenance: hasDirect ? "COMPARABLE_MODELED" : "CATEGORY_BENCHMARK",
    ventureObserved: "UNKNOWN",
    falsePrecision: false,
    recommendedPricingCluster: selection.recommendedPricingCluster,
    selectedPricingCluster: selection.selectedPricingCluster,
    clusterReason: selection.reason,
    clusterConfidence: selection.confidence,
    sampleCount: coreCount,
    sourceQuality,
    independenceState,
    qualityReplacementRequired: Boolean(hasNumericCore && (confidence === "LOW" || confidence === "NONE")),
  };
}

export function coreMonthlyObservationsFromFindings(
  claims: string[],
  context?: VentureContext | null,
): ExtractedMoneyObservation[] {
  const tagged: ExtractedMoneyObservation[] = [];
  for (const claim of claims) {
    const role = classifyPriceRole(claim, context);
    for (const observation of extractMoneyObservations(claim)) {
      if (canContributeToCorePricing(observation, role, claim)) tagged.push(observation);
    }
  }
  return tagged;
}

export function closedCoreMonthlyCount(claims: string[], context?: VentureContext | null): number {
  return coreMonthlyObservationsFromFindings(claims, context).filter(
    (item) => item.boundKind === "CLOSED" && (item.amountHigh != null || item.monthlyRecurringEquivalent != null),
  ).length;
}

export function coreMonthlyRangeFromFindings(
  claims: string[],
  context?: VentureContext | null,
): EconomicRange {
  const tagged: Array<{ observation: ExtractedMoneyObservation; role: ReturnType<typeof classifyPriceRole> }> = [];
  for (const claim of claims) {
    const role = classifyPriceRole(claim, context);
    for (const observation of extractMoneyObservations(claim)) {
      if (canContributeToCorePricing(observation, role, claim)) tagged.push({ observation, role });
    }
  }
  return monthlyRangeFromObservations(
    tagged.map((item) => item.observation),
    tagged.map((item) => item.role),
  );
}

export function setupRangeFromObservations(observations: ExtractedMoneyObservation[]): EconomicRange {
  const setup = observations.filter((item) => item.kind === "SETUP_FEE");
  const amounts = setup.flatMap((item) => [item.amountLow, item.amountHigh, item.amount]).filter((item): item is number => item != null);
  if (!amounts.length) return unknownRange();
  return midpointRange(Math.min(...amounts), Math.max(...amounts));
}

export function annualRangeFromObservations(observations: ExtractedMoneyObservation[]): EconomicRange {
  const relevant = observations.filter(
    (item) =>
      item.annualEquivalent != null &&
      item.kind !== "SETUP_FEE" &&
      item.kind !== "QUALITATIVE_ONLY" &&
      item.kind !== "CHURN" &&
      item.kind !== "GROSS_MARGIN" &&
      item.kind !== "COMMISSION",
  );
  if (!relevant.length) return unknownRange();
  const values = relevant.map((item) => item.annualEquivalent).filter((item): item is number => item != null);
  if (!values.length) return unknownRange();
  return midpointRange(Math.min(...values), Math.max(...values));
}

export function classifySourceClass(url: string | null | undefined): RevenueSourceClass {
  if (!url) return "UNKNOWN";
  const value = url.toLowerCase();
  if (/\/pricing\b/.test(value) || /[?&]pricing=/.test(value)) return "OFFICIAL_PRICING_PAGE";
  if (/\/plans?\b/.test(value)) return "OFFICIAL_PLAN_PAGE";
  if (/\/(product|platform|features)\b/.test(value)) return "OFFICIAL_PRODUCT_PAGE";
  if (/\/(terms|legal|contract)\b/.test(value)) return "OFFICIAL_TERMS";
  if (/proposal/.test(value)) return "PUBLIC_PROPOSAL";
  if (/rate.?card/.test(value)) return "PUBLIC_RATE_CARD";
  if (/marketplace|g2\.com|capterra|getapp/.test(value)) return "PUBLIC_MARKETPLACE_LISTING";
  if (/review|comparison|vs\b|versus/.test(value)) return "CREDIBLE_REVIEW_COMPARISON";
  if (/case-study|customer-stor|testimonial/.test(value)) return "CREDIBLE_CUSTOMER_REPORT";
  if (/benchmark|industry.?report|statista/.test(value)) return "CATEGORY_BENCHMARK";
  return "UNKNOWN";
}

export const SOURCE_CLASS_RANK: Record<RevenueSourceClass, number> = {
  OFFICIAL_PRICING_PAGE: 100,
  OFFICIAL_PLAN_PAGE: 95,
  OFFICIAL_PRODUCT_PAGE: 80,
  OFFICIAL_TERMS: 75,
  PUBLIC_RATE_CARD: 70,
  PUBLIC_PROPOSAL: 65,
  PUBLIC_MARKETPLACE_LISTING: 55,
  CREDIBLE_CUSTOMER_REPORT: 50,
  CREDIBLE_REVIEW_COMPARISON: 40,
  CATEGORY_BENCHMARK: 30,
  UNKNOWN: 10,
};

export function preferredSourceClass(urls: string[]): RevenueSourceClass {
  let best: RevenueSourceClass = "UNKNOWN";
  for (const url of urls) {
    const cls = classifySourceClass(url);
    if (SOURCE_CLASS_RANK[cls] > SOURCE_CLASS_RANK[best]) best = cls;
  }
  return best;
}
