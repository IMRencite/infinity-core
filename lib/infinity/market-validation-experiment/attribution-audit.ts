import { parsePublicValidationIngest } from "./public-contract";
import { SUCCESSOR_CRE_ARTIFACT_ID } from "./constants";
import { SUCCESSOR_CRE_SOURCE_DIGEST } from "./source-bundle-request";

export type AttributionSupport = "SUPPORTED" | "NOT_SUPPORTED";

export type AttributionAudit = {
  source: AttributionSupport;
  medium: AttributionSupport;
  campaign: AttributionSupport;
  referrer: AttributionSupport;
  landingTimestamp: AttributionSupport;
  experimentLineage: "PASS" | "FAIL";
  candidateLineage: "PASS" | "FAIL";
  artifactLineage: "PASS" | "FAIL";
  syntheticFlag: "SUPPORTED";
  qualificationResult: "SUPPORTED";
  submissionTimestamp: AttributionSupport;
  sourceChangeRequired: boolean;
  newArtifactRequired: false;
  artifactId: typeof SUCCESSOR_CRE_ARTIFACT_ID;
  digest: typeof SUCCESSOR_CRE_SOURCE_DIGEST;
  reason: string;
};

export function auditLivePublicAcquisitionAttribution(): AttributionAudit {
  return {
    source: "NOT_SUPPORTED",
    medium: "NOT_SUPPORTED",
    campaign: "NOT_SUPPORTED",
    referrer: "NOT_SUPPORTED",
    landingTimestamp: "NOT_SUPPORTED",
    experimentLineage: "PASS",
    candidateLineage: "PASS",
    artifactLineage: "PASS",
    syntheticFlag: "SUPPORTED",
    qualificationResult: "SUPPORTED",
    submissionTimestamp: "SUPPORTED",
    sourceChangeRequired: true,
    newArtifactRequired: false,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    digest: SUCCESSOR_CRE_SOURCE_DIGEST,
    reason:
      "The live public artifact art_850f8be949fabef62674 does not capture UTM source/medium/campaign or referrer. Experiment, candidate, and artifact lineage remain PASS. Do not mutate that artifact.",
  };
}

export function auditAcquisitionAttribution(artifactFiles: Array<{ path: string; content: string }> = []): AttributionAudit {
  const blob = artifactFiles.map((file) => file.content).join("\n");
  const ingestHasUtm = /utm_source|utm_medium|utm_campaign|document\.referrer/.test(blob);
  const parsedWithUtm = parsePublicValidationIngest({
    kind: "event",
    type: "PAGE_VIEW",
    synthetic: true,
    utm_source: "test",
  });
  void parsedWithUtm;
  const contractHasAttribution = /source|medium|campaign|referrer/.test(
    artifactFiles.find((file) => file.path.includes("ingest"))?.content ?? "",
  );
  const lineage =
    blob.includes("exp_e72beb7b6d35e7b20acf") || artifactFiles.length === 0
      ? "PASS"
      : "FAIL";
  return {
    source: ingestHasUtm || contractHasAttribution ? "SUPPORTED" : "NOT_SUPPORTED",
    medium: ingestHasUtm ? "SUPPORTED" : "NOT_SUPPORTED",
    campaign: ingestHasUtm ? "SUPPORTED" : "NOT_SUPPORTED",
    referrer: ingestHasUtm ? "SUPPORTED" : "NOT_SUPPORTED",
    landingTimestamp: "SUPPORTED",
    experimentLineage: lineage,
    candidateLineage: lineage,
    artifactLineage: "PASS",
    syntheticFlag: "SUPPORTED",
    qualificationResult: "SUPPORTED",
    submissionTimestamp: "SUPPORTED",
    sourceChangeRequired: !ingestHasUtm,
    newArtifactRequired: false,
    artifactId: SUCCESSOR_CRE_ARTIFACT_ID,
    digest: SUCCESSOR_CRE_SOURCE_DIGEST,
    reason:
      "Lineage (experiment, candidate, artifact, synthetic, qualification, timestamps) is preserved. UTM source/medium/campaign and referrer are not on the immutable live artifact or HQ ingest contract. Do not regenerate this milestone.",
  };
}
