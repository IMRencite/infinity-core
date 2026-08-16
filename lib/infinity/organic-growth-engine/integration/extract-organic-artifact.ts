import type { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";
import type {
  GeneratedOrganicPageArtifact,
  OrganicContentContract,
  OrganicGrowthBuildPackage,
} from "../types";

type OrganicPageJsonArtifact = {
  canonicalUrl?: string;
  title?: string;
  sections?: Array<{ heading: string; body: string }>;
  internalLinks?: Array<{ targetUrl: string; anchor: string }>;
  schemaTypes?: string[];
  claims?: Array<{ statement: string; sourceUrl?: string; fabricated?: boolean }>;
  bodyText?: string;
};

function parseOrganicJson(content: string): OrganicPageJsonArtifact {
  return JSON.parse(content) as OrganicPageJsonArtifact;
}

function extractSectionsFromMarkdown(content: string): Array<{ heading: string; body: string }> {
  const sections: Array<{ heading: string; body: string }> = [];
  const chunks = content.split(/^## /m).filter(Boolean);
  for (const chunk of chunks) {
    const [headingLine, ...bodyLines] = chunk.split("\n");
    sections.push({
      heading: headingLine?.trim() ?? "Section",
      body: bodyLines.join("\n").trim(),
    });
  }
  return sections;
}

export async function extractGeneratedOrganicArtifactFromSandbox(input: {
  sandbox: VentureSandbox;
  buildPackage: OrganicGrowthBuildPackage;
  pageOpportunityId: string;
  canonicalUrl: string;
  contentContract: OrganicContentContract;
}): Promise<GeneratedOrganicPageArtifact> {
  const schema = input.buildPackage.schemaRecommendations.find(
    (s) => s.pageOpportunityId === input.pageOpportunityId,
  );
  const preferredPath = `content/organic/${input.pageOpportunityId}.json`;
  const files = await input.sandbox.listFiles();
  const candidatePaths = [
    preferredPath,
    ...files.filter((f) => f.startsWith("content/organic/") && f.endsWith(".json")),
    ...files.filter((f) => f.startsWith("content/organic/") && f.endsWith(".md")),
  ];

  let parsed: OrganicPageJsonArtifact | null = null;
  let rawText = "";

  for (const relativePath of candidatePaths) {
    try {
      rawText = await input.sandbox.readTextFile(relativePath);
      if (relativePath.endsWith(".json")) {
        parsed = parseOrganicJson(rawText);
        break;
      }
      if (relativePath.endsWith(".md")) {
        parsed = {
          title: input.contentContract.primaryQueryIntent,
          sections: extractSectionsFromMarkdown(rawText),
          bodyText: rawText,
        };
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!parsed) {
    throw new Error(
      `No organic artifact found in workspace for page ${input.pageOpportunityId}. Expected ${preferredPath}`,
    );
  }

  const sections =
    parsed.sections ??
    input.contentContract.sections.map((s) => ({
      heading: s.heading,
      body: s.purpose,
    }));

  const bodyText =
    parsed.bodyText ??
    sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n") +
      "\n\n" +
      input.contentContract.questionsAnswered.join(" ");

  const registryLinks = input.buildPackage.internalLinkGraph.links
    .filter((l) => l.sourcePageId === input.pageOpportunityId)
    .slice(0, 5)
    .map((l) => ({ targetUrl: l.targetUrl, anchor: l.anchorIntent }));

  return {
    pageOpportunityId: input.pageOpportunityId,
    canonicalUrl: parsed.canonicalUrl ?? input.canonicalUrl,
    title: parsed.title ?? input.contentContract.primaryQueryIntent,
    bodyText,
    sections,
    internalLinks: parsed.internalLinks ?? registryLinks,
    schemaTypes: parsed.schemaTypes ?? schema?.schemaTypes ?? ["WebPage"],
    claims:
      parsed.claims ??
      input.contentContract.evidenceRequirements.map((c) => ({ statement: c, sourceUrl: undefined })),
  };
}
