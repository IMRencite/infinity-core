import { randomUUID } from "node:crypto";
import type { FeatureContract } from "@/lib/infinity/product-asset-builder/v2/types";
import type { CodingTask } from "@/lib/infinity/product-asset-builder/v2.1/types";
import type {
  GeneratedOrganicPageArtifact,
  OrganicContentContract,
  OrganicGrowthBuildPackage,
  OrganicPabHandoffResult,
  PostGenerationGateResult,
} from "../types";
import { validateGeneratedOrganicArtifact } from "../quality/post-generation-gate";

export function generateOrganicFeatureContracts(
  buildPackage: OrganicGrowthBuildPackage,
): FeatureContract[] {
  return buildPackage.organicContentContracts.map((contract) => {
    const urlEntry = buildPackage.canonicalUrlRegistry.entries.find(
      (e) => e.pageOpportunityId === contract.pageOpportunityId,
    );
    const schema = buildPackage.schemaRecommendations.find(
      (s) => s.pageOpportunityId === contract.pageOpportunityId,
    );
    return {
      featureId: `organic-page-${contract.pageOpportunityId}`,
      featureName: `Organic page: ${contract.primaryQueryIntent}`,
      businessPurpose: contract.primaryAnswerIntent,
      userRoles: ["visitor", "search_engine"],
      functionalRequirements: contract.sections.map((s) => `${s.heading}: ${s.purpose}`),
      nonFunctionalRequirements: [
        "Must satisfy pre-generation organic quality contract",
        "Must not fabricate first-person experience or credentials",
        `Canonical URL: ${urlEntry?.url ?? "TBD"}`,
      ],
      dependencies: contract.internalLinkRequirements.slice(0, 5),
      requiredRoutes: urlEntry ? [new URL(urlEntry.url).pathname] : [],
      requiredDataEntities: contract.supportingEntities,
      requiredAPIs: [],
      requiredUIStates: ["published", "draft"],
      requiredErrorStates: ["not_found"],
      requiredAnalyticsEvents: [`organic_page_view:${contract.pageOpportunityId}`],
      requiredTests: [`organic-contract-${contract.pageOpportunityId}`],
      acceptanceCriteria: [
        "All required sections present",
        "Information gain requirements satisfied",
        "No fabricated expertise claims",
        ...(schema?.schemaTypes.includes("LocalBusiness")
          ? ["LocalBusiness only if verified location exists"]
          : []),
      ],
      revenueRelationship: contract.conversionGoal,
      status: "PLANNED",
    };
  });
}

export function decomposeOrganicPageTasks(input: {
  ventureId: string;
  buildRunId: string;
  contract: FeatureContract;
  contentContract: OrganicContentContract;
  canonicalUrl: string;
}): Omit<CodingTask, "repositoryContext">[] {
  const fc = input.contract.featureId;
  return [
    {
      id: randomUUID(),
      buildRunId: input.buildRunId,
      ventureId: input.ventureId,
      featureContractIds: [fc],
      objective: `Generate organic page content for ${input.contentContract.primaryQueryIntent} at ${input.canonicalUrl}`,
      taskType: "IMPLEMENT_FEATURE",
      complexity: "medium",
      relevantFiles: [],
      allowedPaths: ["content/organic", "app/(organic)"],
      forbiddenPaths: [".env", ".env.local"],
      requirements: input.contentContract.sections.map((s) => s.heading),
      acceptanceCriteria: input.contract.acceptanceCriteria,
      dependencies: [],
      preferredCapabilities: ["coding", "structured_output"],
      maxFilesChanged: 3,
      retryLimit: 2,
      status: "pending",
    },
  ];
}

export function simulateOrganicPageGeneration(input: {
  buildPackage: OrganicGrowthBuildPackage;
  pageOpportunityId: string;
}): GeneratedOrganicPageArtifact {
  const contract = input.buildPackage.organicContentContracts.find(
    (c) => c.pageOpportunityId === input.pageOpportunityId,
  )!;
  const urlEntry = input.buildPackage.canonicalUrlRegistry.entries.find(
    (e) => e.pageOpportunityId === input.pageOpportunityId,
  )!;
  const schema = input.buildPackage.schemaRecommendations.find(
    (s) => s.pageOpportunityId === input.pageOpportunityId,
  );
  const links = input.buildPackage.internalLinkGraph.links
    .filter((l) => l.sourcePageId === input.pageOpportunityId)
    .slice(0, 5)
    .map((l) => ({ targetUrl: l.targetUrl, anchor: l.anchorIntent }));

  return {
    pageOpportunityId: input.pageOpportunityId,
    canonicalUrl: urlEntry.url,
    title: contract.primaryQueryIntent,
    bodyText:
      contract.sections.map((s) => `${s.heading}\n${s.purpose}`).join("\n\n") +
      "\n\n" +
      contract.questionsAnswered.join(" ") +
      " ".repeat(160),
    sections: contract.sections.map((s) => ({ heading: s.heading, body: s.purpose })),
    internalLinks: links,
    schemaTypes: schema?.schemaTypes ?? ["WebPage"],
    claims: contract.evidenceRequirements.map((c) => ({ statement: c, sourceUrl: undefined })),
  };
}

export function runOrganicPabHandoff(input: {
  buildPackage: OrganicGrowthBuildPackage;
  buildRunId: string;
  maxPages?: number;
}): OrganicPabHandoffResult {
  const contracts = generateOrganicFeatureContracts(input.buildPackage);
  const pages = input.buildPackage.approvedPageOpportunities.slice(0, input.maxPages ?? 3);
  const codingTasks: OrganicPabHandoffResult["codingTasks"] = [];
  const traceabilityLinks: OrganicPabHandoffResult["traceabilityLinks"] = [];
  const generatedArtifacts: GeneratedOrganicPageArtifact[] = [];
  const postGenerationResults: PostGenerationGateResult[] = [];

  for (const opp of pages) {
    const fc = contracts.find((c) => c.featureId === `organic-page-${opp.pageOpportunityId}`);
    const contentContract = input.buildPackage.organicContentContracts.find(
      (c) => c.pageOpportunityId === opp.pageOpportunityId,
    );
    const urlEntry = input.buildPackage.canonicalUrlRegistry.entries.find(
      (e) => e.pageOpportunityId === opp.pageOpportunityId,
    );
    if (!fc || !contentContract || !urlEntry) continue;

    const tasks = decomposeOrganicPageTasks({
      ventureId: input.buildPackage.ventureId,
      buildRunId: input.buildRunId,
      contract: fc,
      contentContract,
      canonicalUrl: urlEntry.url,
    });
    codingTasks.push(
      ...tasks.map((t) => ({
        taskId: t.id,
        pageOpportunityId: opp.pageOpportunityId,
        objective: t.objective,
      })),
    );

    traceabilityLinks.push({
      linkType: "organic_page_to_feature_contract",
      sourceRef: opp.pageOpportunityId,
      targetRef: fc.featureId,
    });
    traceabilityLinks.push({
      linkType: "organic_build_package_to_coding_task",
      sourceRef: input.buildPackage.ventureId,
      targetRef: tasks[0]?.id ?? "",
    });

    const artifact = simulateOrganicPageGeneration({
      buildPackage: input.buildPackage,
      pageOpportunityId: opp.pageOpportunityId,
    });
    generatedArtifacts.push(artifact);

    postGenerationResults.push(
      validateGeneratedOrganicArtifact({
        artifact,
        contentContract,
        canonicalUrl: urlEntry.url,
        schemaTypes: artifact.schemaTypes,
        registryUrls: new Set(input.buildPackage.canonicalUrlRegistry.entries.map((e) => e.url)),
      }),
    );
  }

  return {
    featureContracts: contracts
      .filter((c) => pages.some((p) => c.featureId === `organic-page-${p.pageOpportunityId}`))
      .map((c) => ({
        featureId: c.featureId,
        featureName: c.featureName,
        pageOpportunityId: c.featureId.replace("organic-page-", ""),
      })),
    codingTasks,
    traceabilityLinks,
    generatedArtifacts,
    postGenerationResults,
  };
}
