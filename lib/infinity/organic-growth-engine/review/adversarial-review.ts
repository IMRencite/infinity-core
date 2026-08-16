import type { AdversarialReviewFinding, OrganicGrowthBuildPackage, PageOpportunity } from "../types";

export function runAdversarialSeoReview(input: {
  opportunities: PageOpportunity[];
  approvedCount: number;
  rawCount: number;
  invalidLinkTargets: number;
  fabricatedLocalBusiness: number;
  informationGainFailures: number;
  thinContentFailures: number;
}): AdversarialReviewFinding[] {
  const findings: AdversarialReviewFinding[] = [];

  if (input.approvedCount / Math.max(input.rawCount, 1) > 0.9 && input.rawCount > 200) {
    findings.push({
      severity: "critical",
      category: "scale_quality",
      message: "Approval rate suspiciously high for large candidate set — possible keyword-driven page manufacturing",
      blocksExpansion: true,
    });
  }

  if (input.thinContentFailures === 0 && input.rawCount > 500) {
    findings.push({
      severity: "warning",
      category: "thin_content",
      message: "Large candidate set with zero thin-content failures — verify gates are active",
      blocksExpansion: false,
    });
  }

  if (input.informationGainFailures < input.rawCount * 0.3 && input.rawCount > 300) {
    findings.push({
      severity: "critical",
      category: "information_gain",
      message: "Insufficient information-gain rejections for large programmatic candidate matrix",
      blocksExpansion: true,
    });
  }

  if (input.invalidLinkTargets > 0) {
    findings.push({
      severity: "critical",
      category: "internal_links",
      message: `${input.invalidLinkTargets} internal links target unregistered URLs`,
      blocksExpansion: true,
    });
  }

  if (input.fabricatedLocalBusiness > 0) {
    findings.push({
      severity: "critical",
      category: "schema",
      message: "LocalBusiness schema recommended without verified physical location",
      blocksExpansion: true,
    });
  }

  const weakNeighborhoods = input.opportunities.filter(
    (o) => o.pageType === "neighborhood" && o.uniquenessPotential < 0.35,
  );
  if (weakNeighborhoods.length > 5) {
    findings.push({
      severity: "warning",
      category: "local_architecture",
      message: `${weakNeighborhoods.length} weak neighborhood candidates detected — verify merge/reject decisions`,
      blocksExpansion: false,
    });
  }

  return findings;
}

export function packageBlockedByAdversarialReview(
  findings: AdversarialReviewFinding[],
): boolean {
  return findings.some((f) => f.severity === "critical" && f.blocksExpansion);
}

export function summarizeBuildPackageStatus(
  pkg: OrganicGrowthBuildPackage,
): "READY" | "BLOCKED" | "PARTIAL" {
  if (pkg.blockedReasons.length > 0 || packageBlockedByAdversarialReview(pkg.adversarialReviewFindings)) {
    return pkg.approvedPageOpportunities.length > 0 ? "PARTIAL" : "BLOCKED";
  }
  if (!pkg.organicChannelViability.organicAcquisitionRecommended) {
    return pkg.approvedPageOpportunities.length > 0 ? "PARTIAL" : "BLOCKED";
  }
  return "READY";
}
