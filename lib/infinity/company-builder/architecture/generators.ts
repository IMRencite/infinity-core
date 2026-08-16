import { DEFAULT_TECH_STACK_PREFERENCES } from "../constants";
import { classifyVentureTypes, isContentHeavy, isMarketplace, isSaas } from "../classify/venture-type";
import type {
  AcquisitionArchitecture,
  AnalyticsArchitecture,
  AutomationArchitecture,
  BrandArchitecture,
  BuildVsBuyItem,
  BusinessArchitecture,
  ContentArchitecture,
  DataEntity,
  DataModel,
  FailureCriterion,
  IntegrationRequirement,
  LoadedVentureSelectionHandoff,
  ProductArchitecture,
  ProductFeature,
  RevenueImplementationArchitecture,
  TechnicalArchitecture,
  VentureBlueprintCore,
} from "../types";
import type { VentureType } from "../constants";

export function generateBlueprintCore(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): VentureBlueprintCore {
  const title = handoff.candidateTitle ?? handoff.businessConcept;
  return {
    ventureNameWorking: title,
    ventureType,
    secondaryVentureTypes: secondaryTypes,
    businessSummary: handoff.candidateSummary ?? `${handoff.problem} → ${handoff.solution}`,
    problem: handoff.problem,
    solution: handoff.solution,
    targetCustomer: handoff.targetCustomer,
    customerSegments: deriveCustomerSegments(handoff, ventureType),
    payer: derivePayer(handoff, ventureType),
    beneficiary: handoff.targetCustomer,
    primaryValueProposition: deriveValueProposition(handoff, ventureType),
    primaryMonetizationModel: handoff.primaryMonetizationModel,
    secondaryRevenueStreams: handoff.secondaryRevenueStreams,
    pricingStrategy: handoff.pricingStrategy,
    customerAcquisitionStrategy: handoff.distributionStrategy,
    distributionChannels: deriveDistributionChannels(handoff, ventureType, secondaryTypes),
    competitivePositioning: `Focused ${ventureType.replace(/_/g, " ")} offering for ${handoff.targetCustomer} with automation-first delivery.`,
    differentiation: deriveDifferentiation(handoff, ventureType),
    brandRequirements: ["Clear category positioning", "Trust signals aligned to buyer risk", "Professional product-led brand"],
    productRequirements: deriveProductRequirements(handoff, ventureType, secondaryTypes),
    technicalRequirements: deriveTechnicalRequirements(handoff, ventureType, secondaryTypes),
    operationalRequirements: deriveOperationalRequirements(handoff, ventureType),
    contentRequirements: isContentHeavy([ventureType, ...secondaryTypes])
      ? ["Landing pages", "Educational content", "Conversion-oriented copy", "Documentation"]
      : ["Core product copy", "Onboarding messaging"],
    dataRequirements: deriveDataRequirements(ventureType, secondaryTypes),
    integrationRequirements: deriveIntegrationRequirements(handoff, ventureType, secondaryTypes),
    complianceRequirements: deriveComplianceRequirements(handoff, ventureType),
    analyticsRequirements: ["Event tracking", "Funnel analytics", "Revenue attribution", "Cohort retention"],
    growthRequirements: ["Measurable acquisition experiments", "Activation optimization", "Retention loops"],
    supportRequirements: deriveSupportRequirements(ventureType),
    securityRequirements: ["Authentication hardening", "Role-based access control", "Audit logging for sensitive actions"],
    economicTargets: handoff.economicTargets,
    budgetEnvelope: handoff.budgetEnvelope,
    riskConstraints: handoff.riskConstraints,
    successMetrics: deriveSuccessMetrics(ventureType, secondaryTypes),
    failureConditions: deriveFailureConditions(ventureType),
  };
}

function deriveCustomerSegments(handoff: LoadedVentureSelectionHandoff, ventureType: VentureType): string[] {
  const base = [handoff.targetCustomer];
  if (isMarketplace([ventureType])) {
    base.push("Supply-side participants", "Platform operators/administrators");
  }
  if (ventureType === "lead_generation") base.push("Lead buyers / demand partners");
  return base.filter(Boolean);
}

function derivePayer(handoff: LoadedVentureSelectionHandoff, ventureType: VentureType): string {
  if (isMarketplace([ventureType])) return "Transaction participants and/or subscription buyers";
  if (ventureType === "lead_generation") return "Lead buyers";
  if (ventureType === "affiliate_site") return "Affiliate merchants / ad networks (indirect payer via conversions)";
  return handoff.targetCustomer;
}

function deriveValueProposition(handoff: LoadedVentureSelectionHandoff, ventureType: VentureType): string {
  if (isSaas([ventureType])) return `Software workflow that measurably reduces pain: ${handoff.problem}`;
  if (isMarketplace([ventureType])) return `Trusted marketplace workflow connecting supply and demand for: ${handoff.problem}`;
  if (ventureType === "lead_generation") return `Qualified demand capture and routing for: ${handoff.problem}`;
  return handoff.solution;
}

function deriveDistributionChannels(
  handoff: LoadedVentureSelectionHandoff,
  primary: VentureType,
  secondary: VentureType[],
): string[] {
  const channels = new Set<string>();
  const text = `${handoff.distributionStrategy} ${handoff.pricingStrategy}`.toLowerCase();
  if (/seo|organic search|content/.test(text)) channels.add("SEO");
  if (/geo|ai search|llm/.test(text)) channels.add("GEO / AI search visibility");
  if (/paid search|google ads|sem/.test(text)) channels.add("Paid search");
  if (/linkedin|outbound|sales/.test(text)) channels.add("Outbound / B2B sales");
  if (/community|referral|viral/.test(text)) channels.add("Community / referral");
  if (/affiliate|partner/.test(text)) channels.add("Partnerships / affiliates");
  if (isSaas([primary, ...secondary])) channels.add("Product-led onboarding");
  if (isContentHeavy([primary, ...secondary])) channels.add("Content marketing");
  if (channels.size === 0) {
    channels.add("SEO");
    channels.add("Direct outreach");
    channels.add("Product-led onboarding");
  }
  return [...channels];
}

function deriveDifferentiation(handoff: LoadedVentureSelectionHandoff, ventureType: VentureType): string {
  return [
    `Automation-first delivery aligned to Infinity capabilities`,
    `Focused ${ventureType.replace(/_/g, " ")} scope instead of generic platform breadth`,
    handoff.requiredCapabilities.includes("automated_acquisition")
      ? "Acquisition workflows designed for measurable early signal"
      : "Operational model explicitly quantifies human/vendor dependencies",
  ].join("; ");
}

function deriveProductRequirements(h: LoadedVentureSelectionHandoff, primary: VentureType, secondary: VentureType[]): string[] {
  const reqs = [...h.mvpRequirements];
  if (isSaas([primary, ...secondary])) {
    reqs.push("Authenticated multi-tenant workspace", "Core workflow UI", "Billing-ready entitlements model");
  }
  if (isMarketplace([primary, ...secondary])) {
    reqs.push("Supply onboarding", "Demand discovery", "Transaction orchestration", "Trust & safety baseline");
  }
  if (isContentHeavy([primary, ...secondary])) {
    reqs.push("CMS or programmatic page generation", "Lead capture or monetization surfaces");
  }
  return [...new Set(reqs)];
}

function deriveTechnicalRequirements(h: LoadedVentureSelectionHandoff, primary: VentureType, secondary: VentureType[]): string[] {
  const reqs = ["Relational data store", "Authenticated user model", "Event analytics pipeline"];
  if (isSaas([primary, ...secondary])) reqs.push("Background jobs", "API layer", "Role-based authorization");
  if (isMarketplace([primary, ...secondary])) reqs.push("Search/indexing", "Media storage", "Payout-ready ledger abstraction");
  if (/ai|agent|llm|geo/.test(`${h.businessConcept} ${h.solution}`.toLowerCase())) {
    reqs.push("AI inference integration with cost controls");
  }
  return reqs;
}

function deriveOperationalRequirements(h: LoadedVentureSelectionHandoff, primary: VentureType): string[] {
  if (isMarketplace([primary])) return ["Seller verification workflow", "Dispute handling playbook", "Support queue for payment issues"];
  if (primary === "lead_generation") return ["Lead QA rules", "Buyer routing SLA", "Compliance-friendly consent capture"];
  return ["Customer support inbox", "Incident response for billing/auth", "Usage monitoring"];
}

function deriveDataRequirements(primary: VentureType, secondary: VentureType[]): string[] {
  const reqs = ["User profiles", "Event stream", "Audit trail"];
  if (isMarketplace([primary, ...secondary])) reqs.push("Listings catalog", "Transactions ledger", "Reputation signals");
  if (isSaas([primary, ...secondary])) reqs.push("Subscription state", "Usage metrics", "Workspace configuration");
  return reqs;
}

function deriveIntegrationRequirements(h: LoadedVentureSelectionHandoff, primary: VentureType, secondary: VentureType[]): string[] {
  const reqs = ["Email delivery", "Analytics"];
  if (isSaas([primary, ...secondary]) || isMarketplace([primary, ...secondary])) reqs.push("Payment processing");
  if (/erp|integration|webhook/.test(`${h.solution} ${h.businessConcept}`.toLowerCase())) reqs.push("Third-party ERP/API integrations");
  if (/ai|llm|geo/.test(`${h.businessConcept} ${h.solution}`.toLowerCase())) reqs.push("AI provider APIs", "Web/data collection adapters");
  return reqs;
}

function deriveComplianceRequirements(h: LoadedVentureSelectionHandoff, primary: VentureType): string[] {
  const reqs = ["Privacy policy", "Terms of service", "Cookie/consent where applicable"];
  if (/health|finance|regulated|fraud|payment/.test(`${h.businessConcept} ${h.problem}`.toLowerCase())) {
    reqs.push("Enhanced data handling review", "Fraud/compliance monitoring");
  }
  if (primary === "lead_generation") reqs.push("Lead consent and data processing agreements");
  return reqs;
}

function deriveSupportRequirements(primary: VentureType): string[] {
  if (isMarketplace([primary])) return ["Seller support", "Buyer support", "Payment dispute support"];
  if (isSaas([primary])) return ["In-app support", "Billing support", "Onboarding assistance automation"];
  return ["Email support", "Help center"];
}

function deriveSuccessMetrics(primary: VentureType, secondary: VentureType[]): string[] {
  const all = [primary, ...secondary];
  if (isSaas(all)) return ["Activated accounts", "Paid conversion rate", "Monthly recurring revenue", "Logo churn"];
  if (isMarketplace(all)) return ["Active supply", "Active demand", "GMV", "Take rate", "Repeat transactions"];
  if (isContentHeavy(all)) return ["Organic sessions", "Lead conversion rate", "RPM/affiliate EPC", "Email subscribers"];
  return ["Qualified leads", "Conversion rate", "Revenue per visitor"];
}

function deriveFailureConditions(primary: VentureType): string[] {
  return [
    "90-day revenue below minimum viability threshold",
    "CAC exceeds modeled threshold for primary channel",
    "Core activation metric fails to reach MVP target",
    isMarketplace([primary]) ? "Marketplace liquidity remains below minimum transaction density" : "Retention below threshold",
  ];
}

export function generateBusinessArchitecture(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): BusinessArchitecture {
  const all = [ventureType, ...secondaryTypes];
  if (isSaas(all)) {
    return {
      businessModel: "B2B/B2C subscription SaaS with recurring revenue and expansion paths",
      customerJourney: ["Awareness", "Evaluation", "Signup/trial", "Activation", "Paid conversion", "Retention/expansion"],
      acquisitionFunnel: ["Traffic", "Landing page", "Signup", "Activation event", "Trial usage", "Paid plan"],
      activationEvent: "First meaningful workflow completed with measurable outcome",
      coreValueEvent: "Recurring use of primary workflow delivering promised ROI",
      conversionEvent: "Paid subscription started",
      revenueEvent: "Successful subscription charge or invoice payment",
      retentionMechanism: "Habit-forming workflow + reporting value + usage-based stickiness",
      referralMechanism: "Shareable reports or team invites where applicable",
      upsellMechanism: "Higher tier plans, seats, or usage limits",
      crossSellMechanism: "Add-on modules or data exports",
      economicLoop: [
        "Audience/traffic",
        "→ acquisition",
        "→ signup",
        "→ activation",
        "→ value delivery",
        "→ subscription conversion",
        "→ retention",
        "→ expansion/referral",
      ],
    };
  }
  if (isMarketplace(all)) {
    return {
      businessModel: "Two-sided marketplace with liquidity-driven network effects and take-rate/commission revenue",
      customerJourney: ["Supply onboarding", "Listing creation", "Demand discovery", "Transaction", "Fulfillment", "Repeat purchase"],
      acquisitionFunnel: ["Supply acquisition", "Demand acquisition", "Search/browse", "Intent signal", "Transaction", "Repeat"],
      activationEvent: "First completed transaction or qualified lead match",
      coreValueEvent: "Successful match/transacting workflow with trust preserved",
      conversionEvent: "Transaction committed or subscription to marketplace tools activated",
      revenueEvent: "Commission/take-rate captured or seller subscription billed",
      retentionMechanism: "Repeat transactions, reputation, saved preferences, notifications",
      referralMechanism: "Invite sellers/buyers, share listings, community loops",
      upsellMechanism: "Featured listings, promoted inventory, premium seller tools",
      crossSellMechanism: "Adjacent services (fulfillment, analytics, financing)",
      economicLoop: [
        "Supply acquisition",
        "→ inventory/listings",
        "→ demand traffic",
        "→ discovery",
        "→ transaction",
        "→ revenue capture",
        "→ retention on both sides",
      ],
    };
  }
  if (isContentHeavy(all)) {
    return {
      businessModel: "Content-driven audience asset monetized via leads, affiliates, subscriptions, or ads",
      customerJourney: ["Search/social discovery", "Content consumption", "Trust building", "Lead/signup", "Monetization event"],
      acquisitionFunnel: ["Organic traffic", "Content page", "Engagement", "CTA", "Lead/purchase/affiliate click"],
      activationEvent: "First high-intent conversion action (lead submit, affiliate click, signup)",
      coreValueEvent: "Visitor receives actionable insight or offer match",
      conversionEvent: "Lead sold, affiliate conversion, or subscription started",
      revenueEvent: "Lead buyer payment, affiliate commission, or ad/sponsor revenue",
      retentionMechanism: "Email list, content series, community return visits",
      referralMechanism: "Shareable tools/reports and social distribution",
      upsellMechanism: "Premium content, tools, or higher-intent offers",
      crossSellMechanism: "Related offers and comparison pathways",
      economicLoop: [
        "Traffic/audience",
        "→ content engagement",
        "→ intent capture",
        "→ monetization",
        "→ retention",
        "→ compounding SEO/content",
      ],
    };
  }
  return {
    businessModel: handoff.primaryMonetizationModel,
    customerJourney: ["Awareness", "Consideration", "Conversion", "Delivery", "Retention"],
    acquisitionFunnel: ["Traffic", "Landing", "Signup/lead", "Purchase", "Repeat"],
    activationEvent: "First delivered core outcome",
    coreValueEvent: "Customer receives promised outcome",
    conversionEvent: "First payment or qualified lead",
    revenueEvent: "Revenue recognized",
    retentionMechanism: "Repeat usage or repeat purchase",
    referralMechanism: "Word of mouth / shareable outcome",
    upsellMechanism: "Higher tier or add-ons",
    crossSellMechanism: "Adjacent offers",
    economicLoop: ["Audience", "→ acquisition", "→ activation", "→ value", "→ conversion", "→ retention"],
  };
}

export function generateRevenueArchitecture(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): RevenueImplementationArchitecture {
  const model = handoff.primaryMonetizationModel.toLowerCase();
  const all = [ventureType, ...secondaryTypes];

  if (/subscription|saas/.test(model) || isSaas(all)) {
    return {
      monetizationModelType: "subscription_saas",
      implementationRequirements: {
        plans: ["Starter", "Pro", "Team/Enterprise"],
        billingPeriods: ["monthly", "annual"],
        entitlements: ["feature flags", "usage limits", "seat counts"],
        subscriptionLifecycle: ["trial", "active", "past_due", "canceled", "reactivated"],
        trialLogic: "Time-boxed or usage-boxed trial with conversion prompts",
        upgradeDowngradePaths: "Self-serve plan changes with proration rules",
      },
      billingRequirements: ["Stripe Billing or equivalent", "Webhook-driven entitlement sync", "Invoice/receipt delivery"],
      transactionRequirements: ["Payment method capture", "Failed payment retry dunning"],
      attributionRequirements: ["Signup source", "Plan selection", "Trial-to-paid funnel"],
      complianceNotes: ["Sales tax/VAT evaluation", "Refund policy for subscriptions"],
    };
  }
  if (isMarketplace(all) || /marketplace|commission|take rate/.test(model)) {
    return {
      monetizationModelType: "marketplace_commission",
      implementationRequirements: {
        buyers: "Authenticated or guest checkout depending on category",
        sellers: "Onboarding, verification, payout profile",
        listings: "Catalog schema, moderation, search indexing",
        transactions: "Order state machine, escrow optional",
        commissions: "Configurable take rate by category",
        payouts: "Seller payout schedule and reconciliation",
        refundsDisputes: "Dispute workflow and partial refund support",
        liquidityMetrics: ["active sellers", "active buyers", "match rate", "GMV"],
      },
      billingRequirements: ["Split payments or post-transaction commission capture"],
      transactionRequirements: ["Order lifecycle", "Refund/chargeback handling"],
      attributionRequirements: ["Channel/source on both sides", "Conversion on listing views"],
      complianceNotes: ["Seller KYC where required", "Marketplace tax reporting evaluation"],
    };
  }
  if (ventureType === "lead_generation" || /lead/.test(model)) {
    return {
      monetizationModelType: "lead_generation",
      implementationRequirements: {
        leadCapture: "Forms, quizzes, or intent widgets with consent",
        qualification: "Rules engine or scoring for lead quality",
        routing: "Buyer matching and delivery (API/email/CRM)",
        leadPricing: "Dynamic or fixed price per qualified lead",
        tracking: "UTM + event-based attribution",
        conversionAttribution: "Post-delivery feedback loop from buyers",
      },
      billingRequirements: ["Buyer invoicing or prepaid lead credits"],
      transactionRequirements: ["Lead delivery audit log"],
      attributionRequirements: ["Source page", "Campaign", "Lead quality tier"],
      complianceNotes: ["Consent capture", "Do-not-sell/opt-out handling"],
    };
  }
  if (ventureType === "affiliate_site" || /affiliate/.test(model)) {
    return {
      monetizationModelType: "affiliate",
      implementationRequirements: {
        commercialContent: "Comparison/editorial/review templates",
        offerMatching: "Category and intent-based offer routing",
        linkArchitecture: "Tracked outbound links with rel/nofollow policy",
        clickTracking: "Internal redirect or param-based tracking",
        conversionAttribution: "Network postbacks where available",
        merchantRelationships: "Program enrollment and compliance tracking",
        contentToOfferFunnels: "Topical content → comparison → outbound click",
      },
      billingRequirements: ["Affiliate network accounts (future)"],
      transactionRequirements: ["Click and conversion event logging"],
      attributionRequirements: ["Content page", "Offer placement", "Click ID"],
      complianceNotes: ["Affiliate disclosure", "Merchant program TOS compliance"],
    };
  }
  return {
    monetizationModelType: handoff.primaryMonetizationModel,
    implementationRequirements: { primaryModel: handoff.primaryMonetizationModel, pricing: handoff.pricingStrategy },
    billingRequirements: ["Payment processor when direct billing required"],
    transactionRequirements: ["Order or invoice lifecycle"],
    attributionRequirements: ["Campaign/source tracking"],
    complianceNotes: ["Terms, privacy, refund policy"],
  };
}

export function generateProductArchitecture(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): ProductArchitecture {
  const all = [ventureType, ...secondaryTypes];
  const features: ProductFeature[] = [];

  const addFeature = (feature: Omit<ProductFeature, "priority" | "mvpRequired"> & Partial<Pick<ProductFeature, "priority" | "mvpRequired">>) => {
    features.push({
      priority: feature.priority ?? "SHOULD_HAVE",
      mvpRequired: feature.mvpRequired ?? false,
      ...feature,
    });
  };

  if (isSaas(all)) {
    addFeature({
      featureName: "Authenticated workspace",
      description: "User signup/login, org/workspace shell, session management",
      userRole: "customer_admin",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: [],
      complexity: "medium",
      businessPurpose: "Secure access and tenant isolation",
      revenueRelationship: "Required before paid conversion",
      successMetric: "Signup completion rate",
    });
    addFeature({
      featureName: "Core workflow dashboard",
      description: `Primary workflow delivering: ${handoff.solution}`,
      userRole: "end_user",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Authenticated workspace"],
      complexity: "high",
      businessPurpose: "Deliver core value proposition",
      revenueRelationship: "Drives activation and retention",
      successMetric: "Activation event completion rate",
    });
    addFeature({
      featureName: "Subscription billing",
      description: "Plan selection, checkout, entitlements, billing portal hooks",
      userRole: "customer_admin",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Authenticated workspace", "Core workflow dashboard"],
      complexity: "medium",
      businessPurpose: "Capture recurring revenue",
      revenueRelationship: "Direct revenue mechanism",
      successMetric: "Trial-to-paid conversion",
    });
    addFeature({
      featureName: "Reporting & exports",
      description: "Outcome reporting tied to the primary workflow",
      userRole: "end_user",
      priority: "SHOULD_HAVE",
      mvpRequired: false,
      dependencies: ["Core workflow dashboard"],
      complexity: "medium",
      businessPurpose: "Retention and executive buyer justification",
      revenueRelationship: "Supports expansion and renewals",
      successMetric: "Weekly active reporting users",
    });
  }

  if (isMarketplace(all)) {
    addFeature({
      featureName: "Seller onboarding & profiles",
      description: "Seller registration, verification, profile, payout setup placeholder",
      userRole: "seller",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: [],
      complexity: "medium",
      businessPurpose: "Supply-side liquidity",
      revenueRelationship: "Enables listings and transactions",
      successMetric: "Verified sellers onboarded",
    });
    addFeature({
      featureName: "Listing/catalog management",
      description: "Create/edit listings, media upload, categorization, moderation queue",
      userRole: "seller",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Seller onboarding & profiles"],
      complexity: "high",
      businessPurpose: "Inventory/supply surface",
      revenueRelationship: "Required for transactions",
      successMetric: "Active listings per seller",
    });
    addFeature({
      featureName: "Search & discovery",
      description: "Search, filters, ranking, recommendations baseline",
      userRole: "buyer",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Listing/catalog management"],
      complexity: "high",
      businessPurpose: "Demand-side value and match rate",
      revenueRelationship: "Drives conversion",
      successMetric: "Search-to-transaction conversion",
    });
    addFeature({
      featureName: "Transaction checkout",
      description: "Cart/order flow, commission capture, order status tracking",
      userRole: "buyer",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Listing/catalog management"],
      complexity: "high",
      businessPurpose: "Revenue capture",
      revenueRelationship: "Direct",
      successMetric: "Completed transactions",
    });
  }

  if (isContentHeavy(all)) {
    addFeature({
      featureName: "Content publishing engine",
      description: "CMS/programmatic pages, templates, metadata, internal linking",
      userRole: "content_operator",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: [],
      complexity: "medium",
      businessPurpose: "Audience acquisition via SEO/content",
      revenueRelationship: "Traffic generation",
      successMetric: "Indexed pages and organic sessions",
    });
    addFeature({
      featureName: "Lead capture / monetization surfaces",
      description: "CTAs, forms, affiliate modules, comparison widgets",
      userRole: "visitor",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: ["Content publishing engine"],
      complexity: "medium",
      businessPurpose: "Convert traffic to revenue",
      revenueRelationship: "Direct",
      successMetric: "Conversion rate by page type",
    });
  }

  if (features.length === 0) {
    addFeature({
      featureName: "Core offering delivery",
      description: handoff.solution,
      userRole: "customer",
      priority: "MUST_HAVE",
      mvpRequired: true,
      dependencies: [],
      complexity: "medium",
      businessPurpose: "Deliver primary value",
      revenueRelationship: "Enables monetization",
      successMetric: "Core outcome achieved",
    });
  }

  addFeature({
    featureName: "Analytics instrumentation",
    description: "Event tracking for funnel, revenue, and failure signals",
    userRole: "system",
    priority: "MUST_HAVE",
    mvpRequired: true,
    dependencies: [],
    complexity: "low",
    businessPurpose: "Learning loop for Infinity systems",
    revenueRelationship: "Indirect but required",
    successMetric: "Event coverage on critical funnel steps",
  });

  return {
    coreProduct: handoff.solution,
    coreUserOutcome: handoff.problem.replace(/^Customers? /i, "Customer can "),
    userRoles: [...new Set(features.map((f) => f.userRole))],
    userStories: features.slice(0, 8).map((f) => `As a ${f.userRole}, I need ${f.featureName.toLowerCase()} so that ${f.businessPurpose.toLowerCase()}.`),
    features,
  };
}

export function generateComplexMarketplaceProductArchitecture(): ProductArchitecture {
  const roles = ["artist", "collector", "moderator", "admin"];
  const featureNames = [
    ["Authentication & accounts", "Email/OAuth signup, sessions, account settings", "collector", "MUST_HAVE", true],
    ["Artist profiles", "Portfolio, bio, links, verification badge rules", "artist", "MUST_HAVE", true],
    ["Artwork uploads & media storage", "Image upload, variants, metadata, storage lifecycle", "artist", "MUST_HAVE", true],
    ["Posts & feeds", "Home feed, following feed, chronological/trending modes", "collector", "MUST_HAVE", true],
    ["Comments & voting", "Threaded comments, upvotes, ranking inputs", "collector", "MUST_HAVE", true],
    ["Communities", "Community creation, membership, community feeds", "collector", "SHOULD_HAVE", false],
    ["Search & discovery", "Search by tag/artist/style, discovery rails", "collector", "MUST_HAVE", true],
    ["Notifications", "In-app/email notifications for follows, sales, comments", "collector", "SHOULD_HAVE", false],
    ["Creator storefronts", "Artist shop pages, product listings", "artist", "MUST_HAVE", true],
    ["Digital product sales", "Digital download purchase and access control", "artist", "MUST_HAVE", true],
    ["Physical print listings", "Print product variants, fulfillment integration placeholder", "artist", "LATER", false],
    ["Transactions & commissions", "Checkout, platform fee, order history", "collector", "MUST_HAVE", true],
    ["Subscriptions", "Creator subscriptions or premium community access", "artist", "LATER", false],
    ["Moderation & reporting", "Report content, moderation queue, enforcement actions", "moderator", "MUST_HAVE", true],
    ["Reputation system", "Seller/creator reputation based on transactions and moderation", "system", "SHOULD_HAVE", false],
    ["Admin console", "User management, payouts review, platform settings", "admin", "MUST_HAVE", true],
    ["Analytics dashboards", "Creator and platform metrics", "admin", "SHOULD_HAVE", false],
  ] as const;

  const features: ProductFeature[] = featureNames.map(([featureName, description, userRole, priority, mvpRequired]) => ({
    featureName,
    description,
    userRole,
    priority,
    mvpRequired,
    dependencies: featureName.includes("feed") ? ["Artwork uploads & media storage"] : featureName.includes("Transactions") ? ["Creator storefronts"] : [],
    complexity: /upload|transaction|search|moderation/i.test(featureName) ? "high" : "medium",
    businessPurpose: "Support multi-sided creator marketplace loop",
    revenueRelationship: /transaction|subscription|storefront/i.test(featureName) ? "Direct revenue" : "Engagement/retention",
    successMetric: `${featureName} adoption/usage`,
  }));

  return {
    coreProduct: "Creator art community marketplace",
    coreUserOutcome: "Artists monetize work while collectors discover, engage, and purchase in a trusted community",
    userRoles: roles,
    userStories: features.slice(0, 10).map((f) => `As a ${f.userRole}, I need ${f.featureName.toLowerCase()} to participate in the marketplace.`),
    features,
  };
}

export function generateTechnicalArchitecture(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
  productArchitecture: ProductArchitecture,
): TechnicalArchitecture {
  const all = [ventureType, ...secondaryTypes];
  const prefs = DEFAULT_TECH_STACK_PREFERENCES;
  const needsPayments = isSaas(all) || isMarketplace(all) || ventureType === "ecommerce";
  const needsSearch = isMarketplace(all) || productArchitecture.features.some((f) => /search/i.test(f.featureName));
  const needsAi = /ai|llm|geo|agent|analytics platform/.test(`${handoff.businessConcept} ${handoff.solution}`.toLowerCase());

  const components = [
    { name: "Web Application", purpose: "Primary customer-facing app", responsibilities: ["UI", "SSR/CSR pages", "Auth session"], dependencies: ["API Layer"] },
    { name: "API Layer", purpose: "Business logic and authorization", responsibilities: ["REST/RPC endpoints", "Validation", "RBAC"], dependencies: ["Database"] },
    { name: "Database", purpose: "System of record", responsibilities: ["Relational schema", "Migrations", "Auditing"], dependencies: [] },
  ];
  if (needsSearch) components.push({ name: "Search Index", purpose: "Discovery", responsibilities: ["Indexing", "Query"], dependencies: ["Database"] });
  if (needsAi) components.push({ name: "AI Inference Adapter", purpose: "Model calls with cost controls", responsibilities: ["Prompting", "Caching", "Rate limits"], dependencies: ["API Layer"] });
  if (needsPayments) components.push({ name: "Billing Adapter", purpose: "Payments/subscriptions", responsibilities: ["Checkout", "Webhooks"], dependencies: ["API Layer"] });

  return {
    applicationType: isSaas(all) ? "multi_tenant_web_saas" : isMarketplace(all) ? "multi_sided_web_marketplace" : "web_application",
    frontendRequirements: ["Responsive UI", "Accessible components", "Role-aware navigation", "Instrumented user flows"],
    backendRequirements: ["Domain services", "Authorization middleware", "Background jobs", "Webhook handlers"],
    databaseRequirements: ["PostgreSQL primary store", "Migration discipline", "Soft deletes where needed"],
    authenticationRequirements: ["Email/password or OAuth", "Session management", "Optional SSO later"],
    authorizationRequirements: ["Role-based access control", "Resource-level permissions for marketplace/admin"],
    storageRequirements: isMarketplace(all) ? ["Object storage for media", "CDN delivery", "Upload validation"] : ["Static assets", "Optional document storage"],
    searchRequirements: needsSearch ? ["Full-text search", "Facets/filters", "Ranking baseline"] : ["Basic DB search acceptable for MVP"],
    queueRequirements: ["Job queue for emails, indexing, webhooks, AI batch tasks"],
    backgroundJobRequirements: ["Async processing", "Retry/dead-letter handling"],
    aiRequirements: needsAi ? ["Provider abstraction", "Cost caps", "Prompt/version management"] : ["Optional future capability"],
    emailRequirements: ["Transactional email", "Lifecycle messaging hooks"],
    notificationRequirements: isMarketplace(all) ? ["In-app + email notifications"] : ["Email-first notifications"],
    paymentRequirements: needsPayments ? ["Stripe integration architecture", "Webhook-driven state sync"] : ["Not required for MVP"],
    analyticsRequirements: ["Server-side + client event capture", "Revenue event integrity"],
    observabilityRequirements: ["Structured logs", "Error tracking", "Basic metrics/dashboards"],
    securityRequirements: ["Secrets management", "Input validation", "Rate limiting", "Audit logs"],
    deploymentRequirements: ["Staging + production environments", "CI checks", "No production deploy in Company Builder V1"],
    scalingRequirements: ["Stateless app tier", "Horizontal scaling path", "Database indexing strategy"],
    recommendedStack: {
      frontend: prefs.defaultFrontend,
      backend: prefs.defaultBackend,
      database: prefs.defaultDatabase,
      auth: prefs.defaultAuth,
      payments: needsPayments ? prefs.defaultPayments : "Defer until monetization live",
      analytics: prefs.defaultAnalytics,
      search: needsSearch ? "Postgres FTS initially; Meilisearch/Algolia if needed" : "N/A",
      storage: isMarketplace(all) ? "Supabase Storage or S3-compatible object store" : "Minimal",
    },
    alternativesConsidered: ["Fully separate microservices (deferred)", "No-code stack (insufficient for complex marketplace/SaaS)"],
    selectionReasons: [
      "Reuses Infinity familiarity and automation potential",
      "Fast MVP iteration with structured scaling path",
      "Minimizes vendor count for early stage",
    ],
    tradeoffs: [
      "Monolith-first reduces ops burden but may require service extraction later",
      "Managed auth/payments increase vendor dependency but reduce build time",
    ],
    systemComponents: components,
    dataFlows: [
      "Client → API → Database",
      needsPayments ? "Stripe webhook → Billing adapter → Entitlements/orders" : "Internal events → Analytics pipeline",
      needsAi ? "Workflow → AI adapter → Provider → Cached results" : "Reporting queries → Analytics",
    ],
    serviceBoundaries: ["Web app", "API/domain layer", "Async worker", ...(needsPayments ? ["Billing adapter"] : [])],
    externalIntegrations: deriveIntegrationRequirements(handoff, ventureType, secondaryTypes),
  };
}

export function generateDataModel(
  ventureType: VentureType,
  secondaryTypes: VentureType[],
  productArchitecture: ProductArchitecture,
): DataModel {
  const all = [ventureType, ...secondaryTypes];
  const entities: DataEntity[] = [
    { name: "users", purpose: "Accounts and auth identity", keyFields: ["id", "email", "role", "created_at"], relationships: ["memberships", "events"], sensitivity: "pii", retentionRequirements: "Retain while account active + legal window" },
    { name: "organizations", purpose: "Tenant/workspace for SaaS", keyFields: ["id", "name", "plan", "owner_user_id"], relationships: ["users", "subscriptions"], sensitivity: "internal", retentionRequirements: "Retain while customer active" },
    { name: "events", purpose: "Analytics/learning event stream", keyFields: ["id", "user_id", "event_name", "properties", "occurred_at"], relationships: ["users"], sensitivity: "internal", retentionRequirements: "Configurable; aggregate for long-term learning" },
  ];

  if (isMarketplace(all)) {
    entities.push(
      { name: "seller_profiles", purpose: "Supply-side identity", keyFields: ["id", "user_id", "verification_status"], relationships: ["users", "listings"], sensitivity: "internal", retentionRequirements: "Active seller lifecycle" },
      { name: "listings", purpose: "Marketplace inventory", keyFields: ["id", "seller_id", "title", "price", "status"], relationships: ["seller_profiles", "orders"], sensitivity: "public", retentionRequirements: "Archive on delist" },
      { name: "orders", purpose: "Transactions", keyFields: ["id", "buyer_id", "listing_id", "amount", "status"], relationships: ["users", "listings"], sensitivity: "confidential", retentionRequirements: "Financial retention per policy" },
    );
  }
  if (isSaas(all)) {
    entities.push(
      { name: "subscriptions", purpose: "Billing state", keyFields: ["id", "org_id", "plan", "status", "provider_ref"], relationships: ["organizations"], sensitivity: "confidential", retentionRequirements: "Financial/legal retention" },
      { name: "workflow_runs", purpose: "Core product usage records", keyFields: ["id", "org_id", "type", "status", "output"], relationships: ["organizations"], sensitivity: "internal", retentionRequirements: "Customer-configurable where possible" },
    );
  }
  if (isContentHeavy(all)) {
    entities.push(
      { name: "content_pages", purpose: "Published content", keyFields: ["id", "slug", "title", "body", "published_at"], relationships: ["events"], sensitivity: "public", retentionRequirements: "Until unpublished" },
      { name: "leads", purpose: "Captured demand", keyFields: ["id", "email", "source_page", "score"], relationships: ["events"], sensitivity: "pii", retentionRequirements: "Consent-based retention" },
    );
  }

  return {
    entities,
    relationships: entities.flatMap((e) => e.relationships.map((r) => `${e.name} → ${r}`)),
    importantIndexes: ["events(event_name, occurred_at)", "listings(status, category)", "users(email)"],
    dataOwnership: "Customer/org owns business data; platform owns operational telemetry subject to policy",
    dataRetentionRequirements: ["PII minimization", "Deletion requests supported", "Financial records retained per compliance"],
    privacyConsiderations: ["Consent for marketing", "Role-based data access", "Audit access to admin actions"],
  };
}

export function generateIntegrationPlan(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): IntegrationRequirement[] {
  const all = [ventureType, ...secondaryTypes];
  const integrations: IntegrationRequirement[] = [
    {
      capability: "transactional_email",
      requiredOrOptional: "required",
      possibleProviders: ["Resend", "Postmark", "SendGrid"],
      recommendedProvider: "Resend",
      reason: "Onboarding, billing, and notification emails",
      estimatedCost: 20,
      dependencyRisk: 0.2,
      credentialsRequired: true,
      externalAccountRequired: true,
    },
    {
      capability: "product_analytics",
      requiredOrOptional: "required",
      possibleProviders: ["PostHog", "Plausible", "Amplitude"],
      recommendedProvider: "PostHog",
      reason: "Funnel, retention, and revenue learning loop",
      estimatedCost: 0,
      dependencyRisk: 0.25,
      credentialsRequired: true,
      externalAccountRequired: true,
    },
  ];

  if (isSaas(all) || isMarketplace(all)) {
    integrations.push({
      capability: "payments",
      requiredOrOptional: "required",
      possibleProviders: ["Stripe"],
      recommendedProvider: "Stripe",
      reason: "Subscription or transaction monetization",
      estimatedCost: null,
      dependencyRisk: 0.35,
      credentialsRequired: true,
      externalAccountRequired: true,
    });
  }
  if (/ai|llm|geo|agent/.test(`${handoff.businessConcept} ${handoff.solution}`.toLowerCase())) {
    integrations.push({
      capability: "ai_inference",
      requiredOrOptional: "required",
      possibleProviders: ["OpenAI", "Google Gemini"],
      recommendedProvider: "OpenAI",
      reason: "Core workflow or analytics enrichment",
      estimatedCost: 200,
      dependencyRisk: 0.45,
      credentialsRequired: true,
      externalAccountRequired: false,
    });
  }
  if (isMarketplace(all)) {
    integrations.push({
      capability: "object_storage_cdn",
      requiredOrOptional: "required",
      possibleProviders: ["Supabase Storage", "AWS S3 + CloudFront"],
      recommendedProvider: "Supabase Storage",
      reason: "Media hosting for listings",
      estimatedCost: 25,
      dependencyRisk: 0.3,
      credentialsRequired: true,
      externalAccountRequired: false,
    });
  }
  return integrations;
}

export function generateBuildVsBuy(
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): BuildVsBuyItem[] {
  const all = [ventureType, ...secondaryTypes];
  const items: BuildVsBuyItem[] = [
    { component: "authentication", decision: "INTEGRATE", rationale: "Use managed auth to reduce security burden", costEstimate: 0, buildTimeEstimateDays: 5, maintenanceBurden: "low", strategicDifferentiation: "low", vendorLockInRisk: "medium" },
    { component: "analytics", decision: "INTEGRATE", rationale: "Use product analytics platform for speed", costEstimate: 0, buildTimeEstimateDays: 3, maintenanceBurden: "low", strategicDifferentiation: "low", vendorLockInRisk: "medium" },
    { component: "core workflow/domain logic", decision: "BUILD", rationale: "Primary differentiation lives here", costEstimate: null, buildTimeEstimateDays: null, maintenanceBurden: "medium", strategicDifferentiation: "high", vendorLockInRisk: "low" },
  ];
  if (isSaas(all) || isMarketplace(all)) {
    items.push({ component: "payments/billing", decision: "INTEGRATE", rationale: "Stripe reduces PCI and billing complexity", costEstimate: null, buildTimeEstimateDays: 7, maintenanceBurden: "low", strategicDifferentiation: "low", vendorLockInRisk: "medium" });
  }
  if (isMarketplace(all)) {
    items.push({ component: "search", decision: "DEFER", rationale: "Start with Postgres FTS; buy dedicated search if needed", costEstimate: 50, buildTimeEstimateDays: 10, maintenanceBurden: "medium", strategicDifferentiation: "medium", vendorLockInRisk: "medium" });
    items.push({ component: "moderation", decision: "BUILD", rationale: "Workflow + rules are strategic for trust", costEstimate: null, buildTimeEstimateDays: 14, maintenanceBurden: "high", strategicDifferentiation: "high", vendorLockInRisk: "low" });
  } else {
    items.push({ component: "search", decision: "DEFER", rationale: "Not critical unless discovery-heavy", costEstimate: 0, buildTimeEstimateDays: 0, maintenanceBurden: "low", strategicDifferentiation: "low", vendorLockInRisk: "low" });
  }
  items.push({ component: "email delivery", decision: "BUY", rationale: "Transactional provider", costEstimate: 20, buildTimeEstimateDays: 2, maintenanceBurden: "low", strategicDifferentiation: "low", vendorLockInRisk: "low" });
  return items;
}

export function generateAutomationArchitecture(
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): AutomationArchitecture {
  const processes = [
    { process: "research", automationLevel: "mostly_automatable" as const, notes: "Infinity research/scanner pipelines" },
    { process: "content generation", automationLevel: isContentHeavy([ventureType, ...secondaryTypes]) ? "mostly_automatable" as const : "human_vendor_dependent" as const, notes: "AI drafts with review for high-trust pages" },
    { process: "customer acquisition", automationLevel: "mostly_automatable" as const, notes: "SEO/programmatic + paid experiments with tracking" },
    { process: "onboarding", automationLevel: "fully_automatable" as const, notes: "In-app guided flows" },
    { process: "billing", automationLevel: "fully_automatable" as const, notes: "Provider webhooks + dunning" },
    { process: "support", automationLevel: "mostly_automatable" as const, notes: "AI-first support with escalation rules" },
    { process: "moderation", automationLevel: isMarketplace([ventureType, ...secondaryTypes]) ? "human_vendor_dependent" as const : "fully_automatable" as const, notes: "Trust/safety may require human review" },
  ];
  const score = (level: string) =>
    level === "fully_automatable" ? 1 : level === "mostly_automatable" ? 0.75 : level === "human_vendor_dependent" ? 0.4 : 0.2;
  const automationCoverageScore = Math.round((processes.reduce((s, p) => s + score(p.automationLevel), 0) / processes.length) * 100) / 100;
  return {
    processAssessments: processes,
    automationCoverageScore,
    humanDependencyScore: Math.round((1 - automationCoverageScore) * 100) / 100,
    externalVendorDependencyScore: isMarketplace([ventureType, ...secondaryTypes]) ? 0.45 : 0.3,
    futureAgentsRequired: ["Content Agent", "SEO Agent", "Analytics Agent", "Growth Agent", ...(isMarketplace([ventureType, ...secondaryTypes]) ? ["Marketplace Moderation Agent"] : []), ...(isSaas([ventureType, ...secondaryTypes]) ? ["Customer Support Agent"] : [])],
  };
}

export function generateBrandArchitecture(handoff: LoadedVentureSelectionHandoff): BrandArchitecture {
  const workingName = handoff.candidateTitle ?? handoff.businessConcept;
  return {
    workingName,
    brandPosition: `Trusted ${handoff.primaryMonetizationModel.replace(/_/g, " ")} solution for ${handoff.targetCustomer}`,
    audience: handoff.targetCustomer,
    tone: isSaas([classifyVentureTypes(handoff).primary]) ? "Professional, data-driven, credible" : "Clear, helpful, conversion-oriented",
    brandAttributes: ["credible", "focused", "outcome-oriented", "modern"],
    trustRequirements: ["Clear pricing", "Privacy/security posture", "Proof of value in onboarding"],
    visualDirection: "Clean product-led SaaS aesthetic unless content-heavy (editorial layout)",
    namingConstraints: ["Avoid trademark conflicts", "Prefer .com or clear category domain later — do not purchase in V1"],
    domainRequirements: ["Brandable", "Category hint optional", "No purchase in Company Builder V1"],
  };
}

export function generateContentArchitecture(
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): ContentArchitecture | null {
  if (!isContentHeavy([ventureType, ...secondaryTypes]) && !isSaas([ventureType])) {
    return null;
  }
  return {
    contentTypes: isContentHeavy([ventureType, ...secondaryTypes])
      ? ["SEO landing pages", "Comparison pages", "Educational articles", "Lead magnets"]
      : ["Product docs", "Landing pages", "Case-study templates"],
    contentPurpose: isContentHeavy([ventureType, ...secondaryTypes]) ? "Acquire and convert intent traffic" : "Support activation and trust",
    contentFunnelMapping: {
      awareness: "Educational/SEO pages",
      consideration: "Comparison and feature pages",
      conversion: "Pricing/demo/lead capture pages",
    },
    programmaticContentPotential: isContentHeavy([ventureType, ...secondaryTypes]) ? "high" : "medium",
    aiContentPotential: "high",
    humanReviewRequirement: isContentHeavy([ventureType, ...secondaryTypes]) ? "sampled" : "required",
    initialContentRequirements: ["Core landing page", "Primary offer page", "5-10 SEO pages or docs pages"],
    ongoingContentRequirements: ["Weekly publish cadence for SEO", "Refresh underperforming pages", "Experiment variants for CTA"],
  };
}

export function generateAcquisitionArchitecture(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): AcquisitionArchitecture {
  const channels = deriveDistributionChannels(handoff, ventureType, secondaryTypes).map((channel) => ({
    channel,
    role: channel.includes("SEO") || channel.includes("GEO") ? "primary" : "supporting",
    funnelStage: channel.includes("Outbound") ? "consideration" : "awareness",
    requiredAssets: channel.includes("SEO") ? ["Landing pages", "Content templates", "Technical SEO baseline"] : ["Outbound sequences", "Demo assets"],
    trackingRequirements: ["UTM parameters", "Event funnel", "Attribution on signup/lead/purchase"],
    estimatedCost: channel.includes("Paid") ? 2000 : channel.includes("Outbound") ? 500 : 200,
    expectedTimeToSignalDays: channel.includes("SEO") ? 60 : channel.includes("Outbound") ? 21 : 30,
    automationPotential: channel.includes("Outbound") ? "human_vendor_dependent" as const : "mostly_automatable" as const,
    dependencies: channel.includes("SEO") ? ["Content architecture", "Analytics"] : ["CRM/email tooling"],
  }));
  return {
    channels,
    primaryChannel: channels[0]?.channel ?? "SEO",
    supportingChannels: channels.slice(1).map((c) => c.channel),
  };
}

export function generateAnalyticsArchitecture(
  ventureType: VentureType,
  secondaryTypes: VentureType[],
): AnalyticsArchitecture {
  const all = [ventureType, ...secondaryTypes];
  const eventCatalog = ["visitor", "signup", "activation", "lead", "checkout_started", "purchase", "subscription_started", "subscription_canceled", "revenue", "refund"];
  if (isMarketplace(all)) eventCatalog.push("listing_created", "transaction", "seller_onboarded");
  if (isContentHeavy(all)) eventCatalog.push("affiliate_click", "affiliate_conversion", "page_view");

  return {
    northStarMetric: isSaas(all) ? "Weekly activated paying workspaces" : isMarketplace(all) ? "Completed transactions per week" : "Qualified monetized conversions per week",
    leadingIndicators: ["Traffic/sessions", "Signup rate", "Activation rate", "Trial engagement"],
    revenueMetrics: ["MRR/ARR or GMV", "Conversion rate", "ARPA", "Refund rate"],
    acquisitionMetrics: ["CAC by channel", "Cost per signup", "Cost per activation"],
    activationMetrics: ["Time to activation", "Activation completion rate"],
    retentionMetrics: ["D7/D30 retention", "Repeat purchase/subscription renewal"],
    unitEconomicMetrics: ["LTV", "CAC", "LTV/CAC", "Gross margin"],
    failureSignals: ["Activation below threshold", "CAC spike", "Zero revenue after launch window"],
    eventCatalog,
  };
}

export function generateFailureCriteria(
  handoff: LoadedVentureSelectionHandoff,
  ventureType: VentureType,
): FailureCriterion[] {
  return [
    { metric: "CAC", threshold: "> 1.5x modeled CAC for primary channel", evaluationWindow: "90 days post-launch", action: "Pause paid acquisition; revalidate channel" },
    { metric: "Activation rate", threshold: "< 15% signup-to-activation", evaluationWindow: "60 days", action: "Revise MVP scope/onboarding" },
    { metric: "Revenue", threshold: "No paying customers/transactions", evaluationWindow: `${handoff.economicTargets.expectedTimeToRevenue ?? 120} days`, action: "HOLD/REVALIDATE venture" },
    { metric: "Build cost", threshold: "> budget envelope", evaluationWindow: "During build", action: "Architecture feedback → rescope MVP" },
    ...(isMarketplace([ventureType])
      ? [{ metric: "Marketplace liquidity", threshold: "< minimum weekly transactions", evaluationWindow: "90 days", action: "Focus single niche liquidity before expansion" }]
      : []),
  ];
}

export function buildArchitectureContext(handoff: LoadedVentureSelectionHandoff) {
  const { primary, secondary } = classifyVentureTypes(handoff);
  const core = generateBlueprintCore(handoff, primary, secondary);
  const productArchitecture = generateProductArchitecture(handoff, primary, secondary);
  return {
    ventureType: primary,
    secondaryTypes: secondary,
    core,
    businessArchitecture: generateBusinessArchitecture(handoff, primary, secondary),
    revenueArchitecture: generateRevenueArchitecture(handoff, primary, secondary),
    productArchitecture,
    technicalArchitecture: generateTechnicalArchitecture(handoff, primary, secondary, productArchitecture),
    dataModel: generateDataModel(primary, secondary, productArchitecture),
    integrationPlan: generateIntegrationPlan(handoff, primary, secondary),
    buildVsBuy: generateBuildVsBuy(primary, secondary),
    automationArchitecture: generateAutomationArchitecture(primary, secondary),
    brandArchitecture: generateBrandArchitecture(handoff),
    contentArchitecture: generateContentArchitecture(primary, secondary),
    acquisitionArchitecture: generateAcquisitionArchitecture(handoff, primary, secondary),
    analyticsArchitecture: generateAnalyticsArchitecture(primary, secondary),
    failureCriteria: generateFailureCriteria(handoff, primary),
  };
}
