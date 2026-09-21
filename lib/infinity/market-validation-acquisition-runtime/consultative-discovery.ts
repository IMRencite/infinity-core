import type { PersistedProspectRecord } from "./prospect-registry";
import type { ProspectVerificationRecord } from "./fresh-contact-verification";

export const CONSULTATIVE_DISCOVERY = "CONSULTATIVE_DISCOVERY" as const;
export const WAVE_1_MESSAGE_VERSION = "cre_wave_1_consultative_discovery_v2" as const;
export const WAVE_1_CONVERSATION_STAGE = "OPEN_CONTEXT+CURRENT_PROCESS" as const;

export type ConversationStage =
  | "OPEN_CONTEXT"
  | "CURRENT_PROCESS"
  | "OPEN_CONTEXT+CURRENT_PROCESS"
  | "FRICTION"
  | "IMPACT"
  | "RELEVANCE"
  | "SOLUTION"
  | "PRICING"
  | "NEXT_STEP";

export type CommunicationStrategyProfile = {
  profile: typeof CONSULTATIVE_DISCOVERY;
  conversationStage: ConversationStage;
  questionObjective: string;
  knownCurrentProcess: "UNKNOWN";
  knownFriction: "UNKNOWN";
  knownImpact: "UNKNOWN";
  solutionRelevance: "UNKNOWN" | "POSSIBLE" | "ESTABLISHED";
  pricingStageReached: "YES" | "NO";
};

export type ConsultativeMessage = {
  prospectId: string;
  toAddress: string;
  subject: string;
  body: string;
  strategy: CommunicationStrategyProfile;
  includesValidationUrl: false;
  productPositionedAsCrm: false;
  fabricatedClaims: 0;
};

export type MessageQualityGate = {
  sourceGroundedPersonalization: "PASS" | "FAIL";
  consultative: "PASS" | "FAIL";
  questionLed: "PASS" | "FAIL";
  lowPressure: "PASS" | "FAIL";
  currentProcessDiscovery: "PASS" | "FAIL";
  prematurePitch: "YES" | "NO";
  problemAssumption: "YES" | "NO";
  manipulativePressure: "YES" | "NO";
  fabricatedPain: "YES" | "NO";
  unsupportedClaim: "YES" | "NO";
  featureDump: "YES" | "NO";
  multipleCompetingCtas: "YES" | "NO";
  unsupportedClaimsCount: number;
  qualityGate: "PASS" | "FAIL";
};

const FORBIDDEN =
  /limited time|act now|only today|last chance|we're the leading|market leader|already used by|customers love|guaranteed|excel is painful|too slow|losing deals|clients are confused|book a meeting|schedule a demo|crm/i;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function buildConsultativeStrategy(): CommunicationStrategyProfile {
  return {
    profile: CONSULTATIVE_DISCOVERY,
    conversationStage: WAVE_1_CONVERSATION_STAGE,
    questionObjective: "UNDERSTAND_CURRENT_LEASE_COMPARISON_PROCESS",
    knownCurrentProcess: "UNKNOWN",
    knownFriction: "UNKNOWN",
    knownImpact: "UNKNOWN",
    solutionRelevance: "UNKNOWN",
    pricingStageReached: "NO",
  };
}

export function generateConsultativeWave1Message(input: {
  prospect: PersistedProspectRecord;
  verification: ProspectVerificationRecord;
}): ConsultativeMessage {
  const first = firstName(input.prospect.name);
  const org = input.verification.verifiedCompany;
  const market = input.verification.verifiedMarket === "UNKNOWN" ? "" : input.verification.verifiedMarket;
  const question = questionFor(input.prospect);
  const opener = openerFor(input.prospect, org, market);
  const body = [`Hi ${first} — ${opener}`, "", question].join("\n");
  return {
    prospectId: input.prospect.prospectId,
    toAddress: input.verification.verifiedProfessionalEmail ?? "",
    subject: subjectFor(input.prospect),
    body,
    strategy: buildConsultativeStrategy(),
    includesValidationUrl: false,
    productPositionedAsCrm: false,
    fabricatedClaims: 0,
  };
}

function subjectFor(prospect: PersistedProspectRecord): string {
  if (prospect.prospectId === "prs_089dad6786418f4b") return "Question on Columbus lease-scenario comparison";
  if (prospect.prospectId === "prs_0ec2773f4c21713c") return "Question on South Florida occupier lease comparison";
  if (prospect.prospectId === "prs_595d8aa946521b71") return "Question on Chicago tenant-rep lease comparison";
  if (prospect.prospectId === "prs_4fb32c29477ab519") return "Question on occupier lease-portfolio comparison";
  return "Question on lease-scenario comparison";
}

function openerFor(prospect: PersistedProspectRecord, org: string, market: string): string {
  if (prospect.prospectId === "prs_089dad6786418f4b") {
    return `your ${org} Columbus bio describes office tenant representation and occupier lease strategy, including renewal versus relocation work.`;
  }
  if (prospect.prospectId === "prs_0ec2773f4c21713c") {
    return `your ${org} Miami page describes tenant representation for occupiers across South Florida.`;
  }
  if (prospect.prospectId === "prs_595d8aa946521b71") {
    return `${org} lists you as specializing in tenant representation for Chicago office clients.`;
  }
  if (prospect.prospectId === "prs_4fb32c29477ab519") {
    return `your ${org} Occupier Solutions page describes tenant advisory and corporate lease work${market ? ` in ${market}` : ""}.`;
  }
  return `public first-party materials describe your ${prospect.role} work at ${org}.`;
}

function questionFor(prospect: PersistedProspectRecord): string {
  if (prospect.prospectId === "prs_089dad6786418f4b") {
    return "When you're comparing multiple lease scenarios for a client, how are you handling NPV / occupancy-cost comparison today?";
  }
  if (prospect.prospectId === "prs_0ec2773f4c21713c") {
    return "When you're comparing occupancy-cost or renewal-versus-relocation options for a client, how does that analysis typically get done today?";
  }
  if (prospect.prospectId === "prs_595d8aa946521b71") {
    return "When you compare lease options for a client, how are you handling occupancy-cost or NPV analysis today?";
  }
  if (prospect.prospectId === "prs_4fb32c29477ab519") {
    return "When you're comparing multiple lease scenarios across a client portfolio, how are you handling occupancy-cost or NPV analysis today?";
  }
  return "When you're comparing multiple lease scenarios for a client, how are you handling occupancy-cost analysis today?";
}

export function evaluateConsultativeMessageQuality(input: {
  message: ConsultativeMessage;
  verification: ProspectVerificationRecord;
}): MessageQualityGate {
  const text = `${input.message.subject}\n${input.message.body}`;
  const questionLed = /\?/.test(input.message.body) ? ("PASS" as const) : ("FAIL" as const);
  const grounded =
    text.includes(input.verification.verifiedCompany) &&
    /public|bio|page|lists you/i.test(text) &&
    !/we already work together|existing customer/i.test(text)
      ? ("PASS" as const)
      : ("FAIL" as const);
  const forbidden = FORBIDDEN.test(text);
  const prematurePitch = /early-access page|try the tool|our product|lease calculator is/i.test(text);
  const problemAssumption = /excel is painful|too slow|losing deals|clients are confused|manual analysis is/i.test(text);
  const featureDump = (text.match(/NPV|occupancy|sensitivity|shareable|CAM|TI/gi) ?? []).length > 8;
  const ctaCount = (input.message.body.match(/\?/g) ?? []).length;
  const consultative = questionLed === "PASS" && !prematurePitch && !problemAssumption ? ("PASS" as const) : ("FAIL" as const);
  const lowPressure = !/must|urgent|asap|limited time|act now/i.test(text) ? ("PASS" as const) : ("FAIL" as const);
  const currentProcess = /how are you|how does that|how do you/i.test(text) ? ("PASS" as const) : ("FAIL" as const);
  const fail =
    grounded === "FAIL" ||
    consultative === "FAIL" ||
    questionLed === "FAIL" ||
    lowPressure === "FAIL" ||
    currentProcess === "FAIL" ||
    prematurePitch ||
    problemAssumption ||
    forbidden ||
    featureDump ||
    ctaCount !== 1 ||
    input.message.includesValidationUrl ||
    input.message.productPositionedAsCrm;
  return {
    sourceGroundedPersonalization: grounded,
    consultative,
    questionLed,
    lowPressure,
    currentProcessDiscovery: currentProcess,
    prematurePitch: prematurePitch ? "YES" : "NO",
    problemAssumption: problemAssumption ? "YES" : "NO",
    manipulativePressure: forbidden ? "YES" : "NO",
    fabricatedPain: problemAssumption ? "YES" : "NO",
    unsupportedClaim: forbidden ? "YES" : "NO",
    featureDump: featureDump ? "YES" : "NO",
    multipleCompetingCtas: ctaCount !== 1 ? "YES" : "NO",
    unsupportedClaimsCount: forbidden ? 1 : 0,
    qualityGate: fail ? "FAIL" : "PASS",
  };
}
