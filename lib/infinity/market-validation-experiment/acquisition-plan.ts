export type CostClassification = "ACTUAL" | "ESTIMATED" | "BENCHMARK" | "UNKNOWN";
export type ProspectQuality = "HIGH" | "MEDIUM" | "LOW";

export type RankedPersona = {
  id: string;
  label: string;
  rank: number;
  frequencyOfLeaseComparison: "HIGH" | "MEDIUM" | "LOW";
  painSeverity: "HIGH" | "MEDIUM" | "LOW";
  abilityToPurchase: "HIGH" | "MEDIUM" | "LOW";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  existingAlternatives: string;
  reachability: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

export type AcquisitionChannel = {
  channel: string;
  prospectQuality: ProspectQuality;
  expectedValidationValue: string;
  expectedCost: "UNKNOWN";
  costClassification: CostClassification;
  expectedTimeToEvidence: string;
  expectedTimeTo15: string;
  expectedQualifiedReach: "UNKNOWN" | number;
  requiredExternalCapability: string;
  founderAuthorizationRequired: boolean;
  confidence: "LOW" | "MEDIUM";
  evidenceSource: string;
};

export type First15Step = {
  source: string;
  expectedQualifiedProspects: number;
  expectedLabel: "EXPECTED";
  mechanism: string;
  externalActionRequired: string;
  costClassification: CostClassification;
  founderAuthorizationIfRequired: string;
  evidenceCaptured: string;
  fallback: string;
};

export function rankedCrePersonas(): RankedPersona[] {
  return [
    {
      id: "tenant_rep_broker",
      label: "Tenant-representation brokers",
      rank: 1,
      frequencyOfLeaseComparison: "HIGH",
      painSeverity: "HIGH",
      abilityToPurchase: "HIGH",
      urgency: "HIGH",
      existingAlternatives: "Spreadsheets; occasional enterprise lease-analysis tools they cannot justify.",
      reachability: "MEDIUM",
      reason: "Lease comparison and NPV are the job, not a side task. Per-deal $149 matches deal cadence.",
    },
    {
      id: "independent_cre_broker",
      label: "Independent CRE brokers / boutique shops",
      rank: 2,
      frequencyOfLeaseComparison: "HIGH",
      painSeverity: "HIGH",
      abilityToPurchase: "HIGH",
      urgency: "HIGH",
      existingAlternatives: "Rebuild comparison math in Excel for each occupier deal.",
      reachability: "MEDIUM",
      reason: "Same workflow as tenant-rep, slightly broader mix of landlord and occupier work.",
    },
    {
      id: "small_cre_advisory",
      label: "Small CRE advisory teams",
      rank: 3,
      frequencyOfLeaseComparison: "MEDIUM",
      painSeverity: "MEDIUM",
      abilityToPurchase: "MEDIUM",
      urgency: "MEDIUM",
      existingAlternatives: "Shared spreadsheets and junior analyst time.",
      reachability: "MEDIUM",
      reason: "Can buy a $290 seat if one producer owns the tool, but buying cycles are slower.",
    },
    {
      id: "lease_consultant",
      label: "Commercial lease consultants",
      rank: 4,
      frequencyOfLeaseComparison: "HIGH",
      painSeverity: "HIGH",
      abilityToPurchase: "MEDIUM",
      urgency: "MEDIUM",
      existingAlternatives: "Specialist models and audit worksheets.",
      reachability: "LOW",
      reason: "High pain but a smaller, harder-to-reach set.",
    },
    {
      id: "corporate_re_advisor",
      label: "Corporate real-estate advisors",
      rank: 5,
      frequencyOfLeaseComparison: "MEDIUM",
      painSeverity: "MEDIUM",
      abilityToPurchase: "LOW",
      urgency: "LOW",
      existingAlternatives: "Enterprise occupier platforms and procurement.",
      reachability: "LOW",
      reason: "Slower procurement; not the fastest path to 15 qualified respondents.",
    },
  ];
}

export function analyzeAcquisitionChannels(): AcquisitionChannel[] {
  return [
    {
      channel: "Founder-assisted introductions to known tenant-rep and independent CRE brokers",
      prospectQuality: "HIGH",
      expectedValidationValue: "Highest information per conversation; qualification is inspectable.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "1–3 days after authorized outreach",
      expectedTimeTo15: "UNKNOWN if the founder network is smaller than 15; otherwise inside the 14-day window",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "outbound.founder_assisted_introduction",
      founderAuthorizationRequired: true,
      confidence: "MEDIUM",
      evidenceSource:
        "Locked offer target (independent CRE brokers / tenant reps). No Infinity-measured network size. Cost of founder time is UNKNOWN, not zero.",
    },
    {
      channel: "Professional associations and directories (SIOR, ITRA Global, CCIM, NAIOP)",
      prospectQuality: "HIGH",
      expectedValidationValue: "Reach people who already do occupier lease work.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "UNKNOWN",
      expectedTimeTo15: "UNKNOWN",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "outbound.professional_association",
      founderAuthorizationRequired: true,
      confidence: "LOW",
      evidenceSource:
        "SIOR public site states more than 4,000 industry leaders (https://sior.com/home). ITRA Global describes itself as a conflict-free occupier-representation network (https://itraglobal.com/about/). Those are publisher claims, not Infinity-measured reach or response rates.",
    },
    {
      channel: "CRE-specific professional communities and professional social networks",
      prospectQuality: "MEDIUM",
      expectedValidationValue: "Possible qualified replies if posts stay narrow to lease NPV / comparison.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "UNKNOWN",
      expectedTimeTo15: "UNKNOWN",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "outbound.community_post",
      founderAuthorizationRequired: true,
      confidence: "LOW",
      evidenceSource:
        "Public professional networks exist. Community size, CTR, and conversion are UNKNOWN. Do not invent rates.",
    },
    {
      channel: "Search / organic intent via existing Organic Growth Architecture Engine",
      prospectQuality: "MEDIUM",
      expectedValidationValue: "High-intent queries later; too slow as the first-15 mechanism.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "Beyond the remaining 14-day window unless already ranking",
      expectedTimeTo15: "UNKNOWN",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "organic.growth.limited",
      founderAuthorizationRequired: true,
      confidence: "LOW",
      evidenceSource:
        "Existing organic-growth-engine can score queries and plan content. No CRE validation pages are ranking. Large SEO is not justified by zero real evidence.",
    },
    {
      channel: "Existing public directories used as a later bounded contact list",
      prospectQuality: "HIGH",
      expectedValidationValue: "Directory identity can support a small later cohort, not scraping.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "UNKNOWN",
      expectedTimeTo15: "UNKNOWN",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "outbound.bounded_directory_cohort",
      founderAuthorizationRequired: true,
      confidence: "LOW",
      evidenceSource: "Directories are public. Contact availability and response rate are UNKNOWN. Mass scrape/spam is forbidden.",
    },
    {
      channel: "Paid acquisition (future option only)",
      prospectQuality: "LOW",
      expectedValidationValue: "Can buy traffic; does not guarantee qualified CRE brokers.",
      expectedCost: "UNKNOWN",
      costClassification: "UNKNOWN",
      expectedTimeToEvidence: "UNKNOWN",
      expectedTimeTo15: "UNKNOWN",
      expectedQualifiedReach: "UNKNOWN",
      requiredExternalCapability: "ads.manage",
      founderAuthorizationRequired: true,
      confidence: "LOW",
      evidenceSource: "No live ads, no CAC, no CTR. Paid is evaluated and not selected as first channel.",
    },
  ];
}

export function prioritizedChannels(): { rank: number; channel: string }[] {
  return [
    { rank: 1, channel: "Founder-assisted introductions to known tenant-rep and independent CRE brokers" },
    { rank: 2, channel: "Professional associations and directories (SIOR, ITRA Global, CCIM, NAIOP)" },
    { rank: 3, channel: "CRE-specific professional communities and professional social networks" },
  ];
}

export function first15Plan(): {
  steps: First15Step[];
  expectedTotal: number;
  expectedAreActual: false;
  altersRealCounts: false;
} {
  const steps: First15Step[] = [
    {
      source: "Founder-assisted introductions",
      expectedQualifiedProspects: 8,
      expectedLabel: "EXPECTED",
      mechanism: "Named introductions to tenant-rep / independent brokers who already compare leases.",
      externalActionRequired: "Bounded founder outreach (not executed).",
      costClassification: "UNKNOWN",
      founderAuthorizationIfRequired: "New founder authorization required before any send.",
      evidenceCaptured: "Qualified form, pricing selection, source=founder_assisted once attribution exists.",
      fallback: "If introductions are not qualified CRE, stop counting them and do not relax the contract.",
    },
    {
      source: "One professional-community or association post",
      expectedQualifiedProspects: 5,
      expectedLabel: "EXPECTED",
      mechanism: "Single narrow post linking the live validation URL; no mass blast.",
      externalActionRequired: "One governed community post (not executed).",
      costClassification: "UNKNOWN",
      founderAuthorizationIfRequired: "New founder authorization required before posting.",
      evidenceCaptured: "Qualified submissions; reject generic 'interested' traffic that fails role/activity.",
      fallback: "If replies are students/landlords/curious traffic, close the post and return to named introductions.",
    },
    {
      source: "Bounded association-directory follow-up",
      expectedQualifiedProspects: 2,
      expectedLabel: "EXPECTED",
      mechanism: "At most a two-person follow-up cohort from a public professional identity, not a scraped list.",
      externalActionRequired: "Two governed one-to-one messages (not executed).",
      costClassification: "UNKNOWN",
      founderAuthorizationIfRequired: "New founder authorization required; no lead-list purchase.",
      evidenceCaptured: "Same qualification contract; synthetic and founder-QA remain excluded.",
      fallback: "If either contact is outside tenant-rep/broker work, do not replace them with unqualified volume.",
    },
  ];
  return {
    steps,
    expectedTotal: steps.reduce((sum, step) => sum + step.expectedQualifiedProspects, 0),
    expectedAreActual: false,
    altersRealCounts: false,
  };
}

export function nextAcquisitionAction(): {
  action: string;
  channel: string;
  capability: string;
  externalWrite: boolean;
  expectedFinancialExposure: "UNKNOWN";
  existingAuthorization: false;
  newFounderAuthorizationRequired: true;
  why: string;
} {
  return {
    action: "Prepare a bounded founder-assisted introduction pack (named tenant-rep / independent CRE brokers) for later governed execution",
    channel: "Founder-assisted introductions",
    capability: "outbound.founder_assisted_introduction",
    externalWrite: false,
    expectedFinancialExposure: "UNKNOWN",
    existingAuthorization: false,
    newFounderAuthorizationRequired: true,
    why: "Smallest, fastest, highest-information path to qualified evidence. Paid ads and mass outbound are not selected. This milestone only prepares the action; it does not send messages.",
  };
}
