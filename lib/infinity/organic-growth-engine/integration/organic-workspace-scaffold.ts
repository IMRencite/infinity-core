import type { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";

export async function writeOrganicContentWorkspaceScaffold(sandbox: VentureSandbox): Promise<void> {
  await sandbox.writeTextFile(
    "package.json",
    JSON.stringify(
      {
        name: "organic-content-workspace",
        private: true,
        version: "0.0.1",
        description: "Isolated workspace for Organic Growth → PAB organic page generation",
      },
      null,
      2,
    ),
  );

  await sandbox.writeTextFile(
    "content/organic/README.md",
    [
      "# Organic content workspace",
      "",
      "PAB V2.1 generates structured organic page artifacts here.",
      "Expected output: `content/organic/{pageOpportunityId}.json` matching the OrganicContentContract.",
      "",
    ].join("\n"),
  );
}
