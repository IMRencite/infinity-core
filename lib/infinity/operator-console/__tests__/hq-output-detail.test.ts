import { describe, expect, it } from "vitest";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail, formatDetailQueryParam, parseDetailQueryParam } from "@/lib/infinity/operator-console/details/build-entity-detail";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return {
    roomId: "launch_operations",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "external_action",
    sourceRecordId: partial.id,
    metadata: {},
    ...partial,
  };
}

describe("HQ output detail system", () => {
  it("builds tabbed entity detail from inspector model", () => {
    const model = buildArtifactInspectorModel(
      artifact({
        id: "deploy:1",
        artifactType: "deployment",
        title: "Vercel deploy",
      }),
      [],
      {
        deployment: {
          target: "production",
          authorityState: "APPROVED",
          reversibility: "REVERSIBLE",
          actionType: "DEPLOY",
          endpoint: null,
          deploymentStatus: "SUCCEEDED",
          launchStatus: "STAGED",
          blockingReason: null,
          productionReady: true,
          deployed: true,
          publiclyLaunched: false,
          knownCostUsd: null,
          costKnown: false,
        },
      },
    );

    const detail = buildEntityDetail(model);
    expect(detail.availableTabs).toContain("overview");
    expect(detail.availableTabs).toContain("evidence");
    expect(detail.overview.sections.some((s) => s.id === "deployment-output")).toBe(true);
    const deployedRow = detail.overview.sections
      .flatMap((s) => s.rows)
      .find((r) => r.label === "Publicly launched");
    expect(deployedRow?.value).toBe("NOT YET LAUNCHED");
  });

  it("separates generated from published in growth detail", () => {
    const model = buildArtifactInspectorModel(
      artifact({
        id: "growth:1",
        roomId: "growth_department",
        artifactType: "content_artifact",
        title: "Launch blog post",
      }),
      [],
      {
        growth: {
          channel: "Blog",
          audience: "SMB",
          contentIntent: "Launch announcement",
          distributionStatus: "DRAFT",
          published: false,
          generated: true,
          provider: "gemini",
          model: "gemini-3",
          knownCostUsd: 0.12,
          costKnown: true,
        },
      },
    );

    const published = model.sections.flatMap((s) => s.rows).find((r) => r.label === "Published");
    expect(published?.value).toContain("generated only");
  });

  it("parses detail deep-link query format", () => {
    expect(parseDetailQueryParam("artifact:opp:c3")).toEqual({ kind: "artifact", id: "opp:c3" });
    expect(parseDetailQueryParam("opp:c3")).toEqual({ kind: "artifact", id: "opp:c3" });
    expect(formatDetailQueryParam("opp:c3")).toBe("artifact:opp:c3");
  });

  it("build artifact shows NOT YET CREATED without fabricated output", () => {
    const model = buildArtifactInspectorModel(
      artifact({
        id: "prod:1",
        roomId: "product_lab",
        artifactType: "production_artifact",
        title: "Build package",
      }),
      [],
    );
    expect(model.sections.find((s) => s.id === "build-output")?.emptyMessage).toBe("NOT YET CREATED");
  });
});
