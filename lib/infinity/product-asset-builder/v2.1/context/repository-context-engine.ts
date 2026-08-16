import type { VentureSandbox } from "../../workspace/sandbox";
import type { FeatureContract } from "../../v2/types";
import { CONTEXT_BUDGET } from "../constants";
import type { RepositoryContext } from "../types";

function scoreFileRelevance(path: string, hints: string[]): number {
  let score = 0;
  const lower = path.toLowerCase();
  for (const hint of hints) {
    const h = hint.toLowerCase();
    if (lower.includes(h)) score += 3;
  }
  if (lower.includes("store.ts") || lower.includes("schema")) score += 5;
  if (lower.includes("route.ts")) score += 4;
  if (lower.includes("api/")) score += 3;
  if (lower.includes("__tests__")) score += 2;
  if (lower.endsWith("package.json")) score += 4;
  if (lower.endsWith("tsconfig.json")) score += 2;
  return score;
}

export async function buildRepositoryContext(input: {
  sandbox: VentureSandbox;
  featureContracts: FeatureContract[];
  taskHints: string[];
  relevantFiles?: string[];
  priorFailures?: string[];
  reviewerFindings?: string[];
}): Promise<RepositoryContext> {
  const allFiles = await input.sandbox.listFiles();
  const hints = [...input.taskHints, ...input.featureContracts.flatMap((c) => [c.featureId, c.featureName, ...c.requiredAPIs])];

  let packageSummary: Record<string, unknown> = {};
  try {
    packageSummary = JSON.parse(await input.sandbox.readTextFile("package.json"));
  } catch {
    packageSummary = {};
  }

  const scored = allFiles
    .filter((f) => !f.includes("node_modules") && !f.includes(".next"))
    .map((path) => ({ path, score: scoreFileRelevance(path, hints) }))
    .sort((a, b) => b.score - a.score);

  const selectedPaths = new Set<string>(input.relevantFiles ?? []);
  for (const { path, score } of scored) {
    if (selectedPaths.size >= CONTEXT_BUDGET.maxFiles) break;
    if (score > 0 || selectedPaths.size < 4) selectedPaths.add(path);
  }

  const relevantFiles: RepositoryContext["relevantFiles"] = [];
  let totalChars = 0;

  for (const filePath of selectedPaths) {
    if (totalChars >= CONTEXT_BUDGET.maxTotalChars) break;
    try {
      const content = await input.sandbox.readTextFile(filePath);
      const max = Math.min(CONTEXT_BUDGET.maxCharsPerFile, CONTEXT_BUDGET.maxTotalChars - totalChars);
      const excerpt = content.length > max ? `${content.slice(0, max)}\n/* ... truncated ... */` : content;
      totalChars += excerpt.length;
      relevantFiles.push({
        path: filePath,
        excerpt,
        reason: `Relevant to: ${input.taskHints.join(", ")}`,
      });
    } catch {
      /* skip missing */
    }
  }

  const existingRoutes = allFiles.filter((f) => f.includes("/route.ts") || f.endsWith("page.tsx"));
  const existingEntities = allFiles.filter((f) => f.includes("lib/db") || f.includes("data/"));

  return {
    fileTree: allFiles.slice(0, 200),
    packageSummary,
    frameworkHints: ["Next.js App Router", "TypeScript", "JSON file store at data/store.json", "Vitest tests"],
    relevantFiles,
    existingRoutes,
    existingEntities,
    featureContracts: input.featureContracts.map((c) => ({
      featureId: c.featureId,
      featureName: c.featureName,
      requirements: [...c.functionalRequirements, ...c.acceptanceCriteria],
    })),
    priorFailures: input.priorFailures ?? [],
    reviewerFindings: input.reviewerFindings ?? [],
    tokenEstimate: Math.ceil(totalChars / 4),
  };
}

export function formatContextForPrompt(context: RepositoryContext): string {
  const parts = [
    "## Framework",
    context.frameworkHints.join("\n"),
    "## Package",
    JSON.stringify(context.packageSummary, null, 2).slice(0, 2000),
    "## Feature Contracts",
    context.featureContracts.map((c) => `- ${c.featureId}: ${c.requirements.join("; ")}`).join("\n"),
    "## Relevant Files",
  ];
  for (const file of context.relevantFiles) {
    parts.push(`### ${file.path}\n\`\`\`\n${file.excerpt}\n\`\`\``);
  }
  if (context.priorFailures.length) {
    parts.push("## Prior Failures", context.priorFailures.join("\n"));
  }
  if (context.reviewerFindings.length) {
    parts.push("## Reviewer Findings", context.reviewerFindings.join("\n"));
  }
  return parts.join("\n\n");
}
