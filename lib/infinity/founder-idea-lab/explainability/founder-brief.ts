import type { FounderIntelligenceFrontView } from "./view";
import {
  asSentence,
  confidenceDisplay,
  driverStatus,
  evidenceNeed,
  evidenceStatusLabel,
  formatScore,
  founderKnownOr,
  holdingBackSentence,
  isUnknownToken,
  nextResearchSentences,
  parseNumeric,
  revenueModelSentence,
  translateDecision,
  translateDimension,
  translateFindingKind,
  translateStatus,
} from "./founder-language";

type Meta = Record<string, string | number | boolean | null>;

export type FounderEvidenceCard = {
  dimension: string;
  dimensionLabel: string;
  status: string;
  found: string;
  needs: string | null;
  sources: number;
};

export type FounderComparableCard = {
  name: string;
  whatItDoes: string;
  howItMakesMoney: string;
  whatInfinityKnows: string;
  whatInfinityDoesNotKnow: string;
};

export type FounderFriendlyBrief = {
  takeLabel: string;
  takeExplanation: string;
  looksGood: string[];
  holdingBack: string[];
  nextResearch: string[];
  money: {
    unknown: boolean;
    explanation: string;
    recommended: string;
    monthly: string;
    setup: string;
    upsells: string;
    whoPays: string;
    howOften: string;
    confidence: string;
    missing: string[];
    nextStep: string | null;
  };
  comparables: FounderComparableCard[];
  scores: {
    opportunity: string | null;
    decision: string | null;
    validateThreshold: string | null;
    rejectThreshold: string | null;
    gap: string | null;
    explanation: string;
    helping: Array<{ label: string; status: string }>;
    hurting: Array<{ label: string; status: string }>;
    decisionExplanation: string;
  };
  build: {
    ready: "YES" | "NO";
    why: string;
    modeledNote: string | null;
  };
  evidenceCards: FounderEvidenceCard[];
  insights: Array<{ claim: string; badge: string }>;
  numbers: {
    unknown: boolean;
    explanation: string;
    stillNeeded: string[];
    provenance: string | null;
    monthly: string | null;
    cac: string | null;
    ltv: string | null;
    ltvCac: string | null;
    margin: string | null;
    confidence: string | null;
    actualCac: string;
    actualLtv: string;
    cacExplanation: string | null;
    ltvExplanation: string | null;
    marginExplanation: string | null;
  };
  market: {
    hasEstimates: boolean;
    explanation: string;
    estimatedCac: string;
    estimatedLtv: string;
    estimatedLtvCac: string;
    estimatedMargin: string;
    estimatedPayback: string;
    confidence: string;
    basedOn: string;
    mainRisk: string;
    nextToProve: string;
    cacExplanation: string;
    ltvExplanation: string;
    marginExplanation: string;
    sources: Array<{ label: string; value: string; why: string; source: string }>;
    validationTargets: string[];
  };
  moveForward: {
    explanation: string;
    current: string | null;
    validationStartsAt: string | null;
    gap: string | null;
  };
  risks: string[];
  sources: string[];
  advantage: {
    whyCouldThisWin: string;
    whatCustomersHate: string;
    whatInfinityShouldDoDifferently: string;
    whatCustomersWouldLikelyPay: string;
    biggestEconomicUncertainty: string;
  };
};

type EvidenceRow = {
  dimension: string;
  summary: string;
  strength: string;
  polarity: string;
  sourceCount: number;
};

function splitJoined(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim() || value === "UNKNOWN" || value === "NONE") return [];
  return value
    .split(/\s*\|\|\s*|\s*\|\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOverview(raw: unknown): Map<string, { strength: string; polarity: string }> {
  const map = new Map<string, { strength: string; polarity: string }>();
  if (typeof raw !== "string" || !raw.trim()) return map;
  for (const part of raw.split(";")) {
    const match = part.trim().match(/^([a-z_]+):([a-z]+)\/([a-z]+)$/i);
    if (!match) continue;
    map.set(match[1]!.toLowerCase(), { strength: match[2]!.toLowerCase(), polarity: match[3]!.toLowerCase() });
  }
  return map;
}

function evidenceRows(view: FounderIntelligenceFrontView | null, metadata: Meta): EvidenceRow[] {
  const overview = parseOverview(metadata.evidenceOverview);
  if (view?.evidenceSummary.length) {
    return view.evidenceSummary.map((item) => {
      const fromOverview = overview.get(item.dimension);
      const none = item.strength === "none" || /^no evidence/i.test(item.summary);
      return {
        dimension: item.dimension,
        summary: item.summary,
        strength: item.strength,
        polarity: fromOverview?.polarity ?? (none ? "unknown" : "positive"),
        sourceCount: item.sourceCount,
      };
    });
  }
  return [...overview.entries()].map(([dimension, info]) => ({
    dimension,
    summary: info.strength === "none" ? "No evidence in this dimension." : `${translateDimension(dimension)} evidence is ${info.strength}.`,
    strength: info.strength,
    polarity: info.polarity,
    sourceCount: 0,
  }));
}

function takeExplanation(input: {
  decision: string;
  opportunity: number | null;
  classifier: number | null;
  validate: number | null;
  reject: number | null;
}): string {
  const { decision, opportunity, classifier, validate, reject } = input;
  if (decision === "VALIDATE") {
    return "Infinity thinks this is worth testing. The evidence is strong enough to start validation, but not enough to approve a build.";
  }
  if (decision === "BUILD") {
    return "Infinity thinks this is ready to build. Observed customer economics and build gates have passed.";
  }
  if (decision === "REJECT") {
    return "Infinity recommends not pursuing this. The evidence is too weak, or the opportunity is too poor, to continue.";
  }
  if (decision === "HOLD") {
    const ideaLooksStrong =
      opportunity != null && classifier != null && opportunity > classifier && (validate == null || opportunity >= validate);
    if (ideaLooksStrong) {
      return "This looks like a real opportunity, but Infinity does not have enough proof yet to recommend validation or building it.";
    }
    if (classifier != null && reject != null && validate != null && classifier >= reject && classifier < validate) {
      return "Infinity is holding the idea because it is promising enough not to reject, but the evidence is not strong enough yet to begin validation.";
    }
    return "Infinity is holding this idea until there is enough proof to recommend validation or building it.";
  }
  return "Infinity does not have enough persisted decision evidence to give a recommendation yet.";
}

function scoreExplanation(input: {
  decision: string;
  opportunity: number | null;
  classifier: number | null;
  validate: number | null;
}): string {
  if (input.decision === "HOLD" && input.opportunity != null && input.classifier != null && input.validate != null) {
    if (input.opportunity > input.classifier && input.classifier < input.validate) {
      return "The idea itself looks promising, but the evidence used to decide whether to test it is still below Infinity's validation threshold.";
    }
  }
  if (input.decision === "VALIDATE") {
    return "The decision score is high enough to start validation. That is not the same as being ready to build.";
  }
  if (input.decision === "REJECT") {
    return "The decision score is below Infinity's reject threshold, so Infinity does not recommend continuing.";
  }
  if (input.decision === "BUILD") {
    return "The decision score and observed economics are strong enough for Infinity to treat this as ready to build.";
  }
  return "Infinity is still separating how strong the idea looks from whether the evidence is good enough to act.";
}

function decisionExplanation(input: {
  decision: string;
  classifier: number | null;
  validate: number | null;
  reject: number | null;
}): string {
  if (input.decision === "HOLD") {
    return "Infinity is holding the idea because it is promising enough not to reject, but the evidence is not strong enough yet to begin validation.";
  }
  if (input.decision === "VALIDATE") {
    return "Infinity thinks this is worth testing because the decision score meets the validation threshold, while build economics are still unproven.";
  }
  if (input.decision === "BUILD") {
    return "Infinity thinks this is ready to build because observed unit economics and the build gate have passed.";
  }
  if (input.decision === "REJECT") {
    return "Infinity recommends not pursuing this because the decision score is below the reject threshold.";
  }
  return "Infinity does not have a persisted decision yet.";
}

function looksGoodFromEvidence(rows: EvidenceRow[], findings: FounderIntelligenceFrontView["keyFindings"] | undefined): string[] {
  const skipMoneyInference = new Set(["capital_efficiency", "speed_to_revenue"]);
  const fromDimensions: string[] = [];
  for (const row of rows) {
    if (skipMoneyInference.has(row.dimension)) continue;
    if (row.strength === "none" || row.polarity !== "positive") continue;
    if (/^no evidence/i.test(row.summary)) continue;
    const sentence = asSentence(row.summary);
    if (sentence && !fromDimensions.includes(sentence)) fromDimensions.push(sentence);
  }
  if (fromDimensions.length >= 5) return fromDimensions.slice(0, 5);
  const extra = (findings ?? [])
    .filter((item) => item.displayKind !== "FOUNDER_HYPOTHESIS" && !skipMoneyInference.has(item.dimension))
    .map((item) => asSentence(item.claim))
    .filter((claim) => claim && !fromDimensions.includes(claim));
  return [...fromDimensions, ...extra].slice(0, 5);
}

function holdingBackFrom(rows: EvidenceRow[], missingEconomic: string[], moneyGaps: string[]): string[] {
  const items: string[] = [];
  const add = (sentence: string) => {
    if (sentence && !items.includes(sentence) && items.length < 5) items.push(sentence);
  };
  const missingDims = new Set(
    rows
      .filter((row) => row.strength === "none" || row.polarity === "unknown" || /^no evidence/i.test(row.summary))
      .map((row) => row.dimension),
  );
  const blob = [...missingEconomic, ...moneyGaps, ...missingDims].join(" ").toLowerCase();
  if (missingDims.has("pricing") || /pric/.test(blob)) add(holdingBackSentence("pricing"));
  if (missingDims.has("distribution") || /distribution|channel/.test(blob)) add(holdingBackSentence("distribution"));
  if (missingDims.has("capital_efficiency") || /cac|acquisition/.test(blob)) {
    add("We do not know realistic customer acquisition cost.");
  }
  if (/retention|churn/.test(blob)) add("We do not know customer retention/churn.");
  if (/margin/.test(blob)) add("We do not know typical gross margin.");
  if (missingDims.has("speed_to_revenue")) add(holdingBackSentence("speed_to_revenue"));
  if (missingDims.has("buildability")) add(holdingBackSentence("buildability"));
  if (missingDims.has("demand")) add(holdingBackSentence("demand"));
  return items.slice(0, 5);
}

function moneyUnknown(view: FounderIntelligenceFrontView | null): boolean {
  const rm = view?.revenueModel;
  const how = view?.howShouldThisMakeMoney;
  if (!rm && !how) return true;
  if (rm?.coverage === "REVENUE_MODEL_INSUFFICIENT") return true;
  if (isUnknownToken(rm?.recommended) && isUnknownToken(how?.recommendedModel)) return true;
  return false;
}

function comparableCards(view: FounderIntelligenceFrontView | null, metadata: Meta): FounderComparableCard[] {
  const raw: FounderComparableCard[] = view?.comparables.length
    ? view.comparables.map((item) => {
        const namedOnly = /without detailed economic/i.test(item.whyComparable) || item.sourceCount === 0;
        const noPrice = item.noEconomicEvidence || isUnknownToken(item.pricingEvidence) || item.pricingEvidence === "NONE";
        const sells = namedOnly
          ? "Not known yet from public evidence."
          : asSentence(item.whyComparable) || "Not known yet from public evidence.";
        const money = noPrice ? "Not known yet." : founderKnownOr(item.pricingEvidence, "Not known yet.");
        const knows = namedOnly
          ? "Named as a possible comparable."
          : /high/i.test(item.strategicConfidence)
            ? "Strong strategic overlap."
            : "Some strategic overlap.";
        const unknown = noPrice ? "Public pricing and economic benchmarks." : "Nothing material still missing from public pricing.";
        return {
          name: item.name,
          whatItDoes: sells,
          howItMakesMoney: money,
          whatInfinityKnows: knows,
          whatInfinityDoesNotKnow: unknown,
        };
      })
    : splitJoined(metadata.comparableNames || metadata.comparableTable).map((name) => ({
        name: name.split("·")[0]?.split("|")[0]?.trim() || name,
        whatItDoes: "Not known yet from public evidence.",
        howItMakesMoney: "Not known yet.",
        whatInfinityKnows: "Named as a possible comparable.",
        whatInfinityDoesNotKnow: "Public pricing and economic benchmarks.",
      }));
  const seen = new Set<string>();
  return raw.filter((card) => {
    const key = card.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildWhy(view: FounderIntelligenceFrontView | null, metadata: Meta, ready: boolean): { why: string; modeledNote: string | null } {
  if (ready) {
    return { why: "Observed customer acquisition cost, lifetime value, and LTV/CAC have passed the build gate.", modeledNote: null };
  }
  const whyNot = view?.whyNotBuild || String(metadata.whyNotBuild ?? "");
  const unknownEcon = /UNKNOWN|unknown|CAC|LTV/i.test(whyNot) || view?.economics.unknown !== false;
  if (unknownEcon) {
    return {
      why: "We do not yet know the real customer acquisition cost, customer lifetime value, or LTV/CAC ratio.",
      modeledNote: "Comparable estimates can guide research, but they are not enough to approve a build.",
    };
  }
  return {
    why: asSentence(whyNot.replace(/BUILD blocked because /i, "").replace(/portfolioAdjustedScore/g, "the decision score")) ||
      "The build gate has not passed.",
    modeledNote: "Comparable estimates can guide research, but they are not enough to approve a build.",
  };
}

function humanRisk(raw: string): string {
  if (isUnknownToken(raw)) return "";
  return asSentence(
    raw
      .replace(/\bUNKNOWN\b/g, "not known yet")
      .replace(/capital_efficiency/g, "customer acquisition cost")
      .replace(/speed_to_revenue/g, "speed to revenue")
      .replace(/portfolioAdjustedScore/g, "the decision score")
      .replace(/COMPARABLE_MODELED/g, "estimates from similar businesses")
      .replace(/FOUNDER_HYPOTHESIS/g, "founder assumption")
      .replace(/EVIDENCE_GROUNDED/g, "researched evidence"),
  );
}

export function buildFounderFriendlyBrief(
  view: FounderIntelligenceFrontView | null,
  metadata: Meta,
): FounderFriendlyBrief {
  const decisionRaw = String(view?.decision ?? metadata.infinityDecision ?? "").toUpperCase();
  const decision = ["HOLD", "VALIDATE", "BUILD", "REJECT"].includes(decisionRaw) ? decisionRaw : "";
  const opportunity = parseNumeric(metadata.opportunityScore);
  const classifier = parseNumeric(metadata.classifierMetric ?? metadata.selectionScore);
  const validate = parseNumeric(metadata.validateThreshold) ?? 58;
  const reject = parseNumeric(metadata.rejectThreshold) ?? 45;
  const rows = evidenceRows(view, metadata);
  const missingEconomic = view?.missingEconomicEvidence ?? [];
  const moneyGaps = view?.revenueModel?.moneyGaps ?? view?.revenueModel?.missingMoneyEvidence ?? [];
  const looksGood = looksGoodFromEvidence(rows, view?.keyFindings);
  const holdingBack = holdingBackFrom(rows, missingEconomic, moneyGaps);
  const nextSignals = [
    ...holdingBack,
    ...missingEconomic,
    ...moneyGaps,
    ...(view?.nextValidation ?? splitJoined(metadata.nextValidation)),
    ...rows.filter((row) => row.strength === "none").map((row) => row.dimension),
  ];
  const nextResearch = nextResearchSentences(nextSignals);
  const unknownMoney = moneyUnknown(view);
  const how = view?.howShouldThisMakeMoney;
  const rm = view?.revenueModel;
  const recommendedEnum = !isUnknownToken(rm?.recommended)
    ? String(rm?.recommended)
    : !isUnknownToken(how?.recommendedModel)
      ? String(how?.recommendedModel)
      : "UNKNOWN";
  const gap =
    classifier != null && validate != null && classifier < validate
      ? formatScore(Math.round((validate - classifier) * 100) / 100)
      : null;
  const helping = rows
    .filter((row) => row.polarity === "positive" && row.strength !== "none")
    .map((row) => ({ label: translateDimension(row.dimension), status: driverStatus(row.strength, row.polarity) }));
  const hurting = rows
    .filter((row) => row.strength === "none" || row.polarity === "unknown" || row.polarity === "negative")
    .map((row) => ({ label: translateDimension(row.dimension), status: driverStatus(row.strength, row.polarity) }));
  const ready = metadata.buildReady === true || metadata.buildReady === "YES";
  const build = buildWhy(view, metadata, ready);
  const bench = view?.benchmarkEconomics;
  const hasModeledNumbers = Boolean(bench && !bench.unknown);
  const economicsUnknown =
    !hasModeledNumbers &&
    view?.economics.unknown !== false &&
    (isUnknownToken(view?.economics.cac) || isUnknownToken(metadata.modeledCac));
  const provenance = view?.economics.provenance ?? String(metadata.economicProvenance ?? "");
  const marketConfidenceRaw = bench?.confidence ?? view?.economics.confidence;
  const marketConfidence =
    !marketConfidenceRaw || marketConfidenceRaw === "NONE" || marketConfidenceRaw === "UNKNOWN"
      ? "Not enough evidence"
      : confidenceDisplay(marketConfidenceRaw) === "Not enough data"
        ? "Not enough evidence"
        : confidenceDisplay(marketConfidenceRaw);
  const validationTargets = [
    hasModeledNumbers && !isUnknownToken(bench?.nextToProve) ? String(bench?.nextToProve) : null,
    hasModeledNumbers && /retention|lifetime/i.test(String(bench?.mainUncertainty ?? ""))
      ? "Do early cohorts show retention consistent with this assumption?"
      : null,
  ].filter((item): item is string => Boolean(item));
  const nextResearchWithValidation = [
    ...nextResearch,
    ...validationTargets.filter((item) => !nextResearch.includes(item)),
  ].slice(0, 5);

  return {
    takeLabel: translateDecision(decision || "UNKNOWN"),
    takeExplanation: takeExplanation({ decision, opportunity, classifier, validate, reject }),
    looksGood,
    holdingBack,
    nextResearch: nextResearchWithValidation.length ? nextResearchWithValidation : ["Research how similar platforms currently charge customers."],
    money: unknownMoney
      ? {
          unknown: true,
          explanation: "We have not found enough real pricing data yet to recommend a money model.",
          recommended: "Not enough evidence yet",
          monthly: "Not known yet",
          setup: "Not known yet",
          upsells: "Not known yet",
          whoPays: "Not known yet",
          howOften: "Not known yet",
          confidence: "Not enough data",
          missing: ["comparable monthly pricing", "setup fees", "CAC benchmarks", "retention/churn"],
          nextStep: "Research how similar platforms currently charge customers.",
        }
      : {
          unknown: false,
          explanation: revenueModelSentence(recommendedEnum),
          recommended: revenueModelSentence(recommendedEnum),
          monthly: founderKnownOr(how?.coreRevenue ?? rm?.mrrPerCustomer ?? view?.pricing.monthly),
          setup: founderKnownOr(how?.setupOnboarding ?? rm?.setup ?? view?.pricing.setup),
          upsells: founderKnownOr(how?.upsells ?? rm?.upsells?.join(", ")),
          whoPays: founderKnownOr(how?.billingStructure, "The target customer pays."),
          howOften: /annual/i.test(String(how?.billingStructure ?? rm?.streams?.join(" ") ?? ""))
            ? "Annually, or monthly if they choose a monthly plan."
            : "Typically every month.",
          confidence: confidenceDisplay(how?.confidence ?? rm?.quality),
          missing: (how?.remainingUnknowns ?? []).filter((item) => !isUnknownToken(item)).slice(0, 4),
          nextStep: null,
        },
    comparables: comparableCards(view, metadata),
    scores: {
      opportunity: formatScore(opportunity),
      decision: formatScore(classifier),
      validateThreshold: formatScore(validate),
      rejectThreshold: formatScore(reject),
      gap,
      explanation: scoreExplanation({ decision, opportunity, classifier, validate }),
      helping,
      hurting,
      decisionExplanation: decisionExplanation({ decision, classifier, validate, reject }),
    },
    build: {
      ready: ready ? "YES" : "NO",
      why: build.why,
      modeledNote: build.modeledNote,
    },
    evidenceCards: rows.map((row) => ({
      dimension: row.dimension,
      dimensionLabel: translateDimension(row.dimension),
      status: evidenceStatusLabel(row.strength, row.polarity),
      found: row.strength === "none" ? "No evidence yet." : asSentence(row.summary),
      needs: row.strength === "none" ? evidenceNeed(row.dimension) : null,
      sources: row.sourceCount,
    })),
    insights: (view?.keyFindings ?? []).slice(0, 8).map((item) => ({
      claim: asSentence(item.claim),
      badge: translateFindingKind(item.displayKind),
    })),
    numbers: economicsUnknown
      ? {
          unknown: true,
          explanation: "Not enough data yet.",
          stillNeeded: ["CAC", "LTV", "retention", "gross margin"].filter((item) => {
            if (item === "CAC") return isUnknownToken(view?.economics.cac ?? metadata.modeledCac);
            if (item === "LTV") return isUnknownToken(view?.economics.ltv ?? metadata.modeledLtv);
            return true;
          }),
          provenance: provenance ? translateStatus(provenance) : null,
          monthly: null,
          cac: null,
          ltv: null,
          ltvCac: null,
          margin: null,
          confidence: null,
          actualCac: "Not measured yet",
          actualLtv: "Not measured yet",
          cacExplanation: null,
          ltvExplanation: null,
          marginExplanation: null,
        }
      : {
          unknown: false,
          explanation: hasModeledNumbers
            ? "We don't know the actual numbers yet, but similar businesses give us a reasonable starting estimate."
            : "These figures come from similar businesses, not from this venture's own customers yet.",
          stillNeeded: [],
          provenance: provenance ? translateStatus(provenance) : null,
          monthly: founderKnownOr(view?.pricing.monthly),
          cac: founderKnownOr(bench?.cac ?? view?.economics.cac ?? metadata.modeledCac),
          ltv: founderKnownOr(bench?.ltv ?? view?.economics.ltv ?? metadata.modeledLtv),
          ltvCac: founderKnownOr(bench?.ltvCac ?? view?.economics.ltvCac ?? metadata.modeledLtvCac),
          margin: founderKnownOr(bench?.margin ?? view?.economics.grossMargin),
          confidence: marketConfidence,
          actualCac: "Not measured yet",
          actualLtv: "Not measured yet",
          cacExplanation: bench?.cacExplanation ?? null,
          ltvExplanation: bench?.ltvExplanation ?? null,
          marginExplanation: bench?.marginExplanation ?? null,
        },
    market: {
      hasEstimates: hasModeledNumbers,
      explanation: hasModeledNumbers
        ? "We do not have actual venture economics yet. Based on similar businesses, Infinity estimated a starting range."
        : "We do not have actual venture economics yet, and there is not enough trustworthy market evidence to estimate them.",
      estimatedCac: hasModeledNumbers ? founderKnownOr(bench?.cac) : "Not enough trustworthy benchmarks yet",
      estimatedLtv: hasModeledNumbers ? founderKnownOr(bench?.ltv) : "Not enough trustworthy benchmarks yet",
      estimatedLtvCac: hasModeledNumbers ? founderKnownOr(bench?.ltvCac) : "Not enough trustworthy benchmarks yet",
      estimatedMargin: hasModeledNumbers ? founderKnownOr(bench?.margin) : "Not enough trustworthy benchmarks yet",
      estimatedPayback: hasModeledNumbers ? founderKnownOr(bench?.payback) : "Not enough trustworthy benchmarks yet",
      confidence: marketConfidence,
      basedOn: hasModeledNumbers
        ? `${bench?.sampleAccepted ?? 0} relevant category/comparable benchmarks`
        : "No accepted benchmark sample yet",
      mainRisk: founderKnownOr(bench?.mainUncertainty, "Customer acquisition cost is still unproven."),
      nextToProve: founderKnownOr(bench?.nextToProve, "Measure real CAC on a bounded acquisition test."),
      cacExplanation:
        bench?.cacExplanation ??
        "Infinity cannot estimate CAC until trustworthy category or comparable evidence exists.",
      ltvExplanation:
        bench?.ltvExplanation ??
        "Customer lifetime value cannot be estimated until margin and retention evidence exist.",
      marginExplanation:
        bench?.marginExplanation ??
        "Gross margin is not known yet; a generic software margin is not assumed.",
      sources: (bench?.sources ?? []).map((item) => ({
        label: item.label,
        value: founderKnownOr(item.value),
        why: item.why,
        source: item.source,
      })),
      validationTargets,
    },
    moveForward: {
      explanation:
        holdingBack.length > 0
          ? `The most valuable next evidence is ${holdingBack
              .slice(0, 4)
              .map((item) =>
                /charg|pric/i.test(item)
                  ? "pricing"
                  : /channel/i.test(item)
                    ? "distribution"
                    : /acquisition cost/i.test(item)
                      ? "acquisition cost"
                      : /retention|churn/i.test(item)
                        ? "retention"
                        : "missing evidence",
              )
              .filter((item, index, all) => all.indexOf(item) === index)
              .join(", ")
              .replace(/, ([^,]*)$/, ", and $1")}.`
          : "New grounded evidence can move the decision; no single finding is guaranteed to close the gap.",
      current: formatScore(classifier),
      validationStartsAt: formatScore(validate),
      gap,
    },
    risks: splitJoined(metadata.risksUncertainties).map(humanRisk).filter(Boolean).slice(0, 6),
    sources: (view?.sourceTrace ?? []).map((row) => row.sourceUrl).filter(Boolean).filter((url, index, all) => all.indexOf(url) === index).slice(0, 8),
    advantage: {
      whyCouldThisWin: view?.productAdvantage?.summary.whyThisCouldWin ?? "Not enough evidence yet to say why this could win.",
      whatCustomersHate: view?.productAdvantage?.summary.whatCustomersHate ?? "Not enough public complaint evidence yet.",
      whatInfinityShouldDoDifferently:
        view?.productAdvantage?.summary.whatInfinityShouldDoDifferently ??
        "Keep researching competitor friction before changing the product.",
      whatCustomersWouldLikelyPay:
        view?.productAdvantage?.summary.whatCustomersWouldLikelyPay ??
        "Competitor prices are anchors, not proof that Infinity will achieve the same price.",
      biggestEconomicUncertainty:
        view?.productAdvantage?.summary.biggestEconomicUncertainty ??
        "Unit economics are still modeled, not observed.",
    },
  };
}
