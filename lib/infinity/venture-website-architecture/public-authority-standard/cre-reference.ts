import {
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
} from "@/lib/infinity/market-validation-experiment/constants";
import { searchResearchSummary } from "../search-validated-question-graph";
import { LOCKED_QUALITY_FLOORS } from "./constants";
import { adaptAuthorityContentWidthProfile } from "./authority-content-width";

export const CRE_PUBLIC_AUTHORITY_REFERENCE = {
  venture: "CRE Lease Comparison / NPV Validation",
  role: "REFERENCE_IMPLEMENTATION" as const,
  artifactId: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  digest: SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_SOURCE_DIGEST,
  metricsAreUniversalMinimums: false as const,
  lockedArtifactId: "art_00cd1821c5a178bf2487",
  lockedDigest: "09857789812df6bcba9f18a70ab35e03965373855bb3fa849e22e43d363f4823",
  deploymentId: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  activeUrl: DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  qualityState: "PASS" as const,
  founderReview: "PENDING" as const,
  baseline: {
    coreTopics: 7,
    rawValidatedQuestions: 154,
    canonicalQuestions: 109,
    mergedVariants: 45,
    newAuthorityPages: 24,
    answerChunks: 205,
    authorityNodes: 41,
    contextualEdges: 362,
    authorityCitations: 96,
    orphans: 0,
    deadEnds: 0,
  },
  widthProfile: adaptAuthorityContentWidthProfile({
    pageShellMaxWidth: 1280,
    authoritySectionMaxWidth: 1120,
    proseMaxWidth: 832,
    wideModuleMaxWidth: 1120,
    fullBleedAllowed: false,
    desktopOuterGutter: 32,
    mobileOuterGutter: 20,
    minDesktopShellUtilization: 0.68,
    minUsefulCardWidth: 248,
    preferredFourCardLayout: "2x2",
    preferredFiveCardLayout: "3+2",
    preferredSixCardLayout: "3x2",
    proseMinWidth: 720,
    proseMaxComfortWidth: 860,
  }),
} as const;

export function creReferenceCompatibility() {
  const research = searchResearchSummary();
  const identityMatch =
    CRE_PUBLIC_AUTHORITY_REFERENCE.artifactId === CRE_PUBLIC_AUTHORITY_REFERENCE.lockedArtifactId &&
    CRE_PUBLIC_AUTHORITY_REFERENCE.digest === CRE_PUBLIC_AUTHORITY_REFERENCE.lockedDigest;
  const researchMatch =
    research.topicsResearched === 7 &&
    research.rawValidatedQuestionCandidates === 154 &&
    research.canonicalUnique === 109 &&
    research.minimumTwentyPerTopic &&
    research.fabricatedSearchVolume === false;
  return {
    overall: identityMatch && researchMatch ? ("PASS" as const) : ("FAIL" as const),
    identityMatch,
    researchMatch,
    floorsUnchanged: LOCKED_QUALITY_FLOORS.minValidatedQuestionsPerCoreTopic === 20,
  };
}

export const CRE_TERMS_FORBIDDEN_IN_GLOBAL_STANDARD = [
  "lease",
  "npv",
  "cam",
  "tenant-rep",
  "tenant rep",
  "effective rent",
] as const;
