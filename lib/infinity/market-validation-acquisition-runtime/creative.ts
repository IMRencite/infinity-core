export function evaluateCreativeAcquisitionNeed(input: { qualifiedEvidence: number }): {
  justified: false;
  assetsGenerated: 0;
  reason: string;
} {
  return {
    justified: false,
    assetsGenerated: 0,
    reason:
      input.qualifiedEvidence === 0
        ? "Creative Media is not justified: zero qualified evidence, so a graphic would not increase trustworthy CRE signal."
        : "Creative Media remains deferred until acquisition value is evidenced.",
  };
}
