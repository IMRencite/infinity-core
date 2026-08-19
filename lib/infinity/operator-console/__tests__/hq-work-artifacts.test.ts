import { describe, expect, it } from "vitest";
import { groupArtifactsForDisplay } from "@/lib/infinity/operator-console/artifacts/grouping";
import { formatArtifactPrimaryDisplay, formatFatalRiskDelta } from "@/lib/infinity/operator-console/artifacts/artifact-display";
import { sanitizeArtifactMetadata } from "@/lib/infinity/operator-console/artifacts/metadata-sanitize";
import { HQ_ARTIFACT_DISPLAY_LIMIT } from "@/lib/infinity/operator-console/artifacts/types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

function artifact(partial: Partial<HqWorkArtifact> & Pick<HqWorkArtifact, "id" | "artifactType" | "title">): HqWorkArtifact {
  return {
    roomId: "opportunity_lab",
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: "opportunity_candidate",
    sourceRecordId: partial.id,
    metadata: {},
    ...partial,
  };
}

describe("HQ persisted work artifacts", () => {
  it("groups artifacts with truthful overflow counts when a viewport cap is applied", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      artifact({ id: `c${i}`, artifactType: "opportunity_candidate", title: `Candidate ${i}` }),
    );
    const grouped = groupArtifactsForDisplay(items, 3);
    expect(grouped.visible).toHaveLength(3);
    expect(grouped.overflowCount).toBe(7);
    expect(grouped.totalCount).toBe(10);
    expect(grouped.artifactLoaded).toBe(10);
    expect(grouped.missingCount).toBe(0);
  });

  it("does not expose secret metadata keys", () => {
    const meta = sanitizeArtifactMetadata({
      score: 72,
      apiKey: "secret-key",
      service_role_key: "hidden",
      candidateId: "abc",
    });
    expect(meta.score).toBe(72);
    expect(meta.candidateId).toBe("abc");
    expect(meta.apiKey).toBeUndefined();
    expect(meta.service_role_key).toBeUndefined();
  });

  it("maps opportunity candidate artifact fields", () => {
    const item = artifact({
      id: "ce09ed5b-c085-45a2-b9c4-473e37fbf0c1",
      artifactType: "opportunity_candidate",
      title: "PropTech SaaS",
      metadata: sanitizeArtifactMetadata({ score: 81.2, rank: 1, candidateId: "ce09ed5b-c085-45a2-b9c4-473e37fbf0c1" }),
    });
    expect(item.sourceRecordId).toBe(item.id);
    expect(item.metadata.rank).toBe(1);
  });

  it("uses CREATING state for active provider-backed work", () => {
    const creating = artifact({
      id: "research-1",
      artifactType: "validation_evidence",
      title: "Provider acquisition",
      state: "CREATING",
    });
    const ready = artifact({
      id: "research-1-ready",
      artifactType: "validation_evidence",
      title: "Provider acquisition",
      state: "READY",
    });
    expect(creating.state).toBe("CREATING");
    expect(ready.state).toBe("READY");
  });

  it("preserves BUILD/VALIDATE decision tokens from persisted decision metadata", () => {
    const token = artifact({
      id: "decision-1",
      roomId: "quality_control",
      artifactType: "decision",
      title: "VALIDATE",
      metadata: sanitizeArtifactMetadata({ decision: "VALIDATE" }),
    });
    expect(token.metadata.decision).toBe("VALIDATE");
  });

  it("empty persisted set produces no visible artifacts", () => {
    const grouped = groupArtifactsForDisplay([]);
    expect(grouped.visible).toHaveLength(0);
    expect(grouped.totalCount).toBe(0);
  });

  it("shows the full loaded set by default without a +N overflow", () => {
    expect(HQ_ARTIFACT_DISPLAY_LIMIT).toBeGreaterThanOrEqual(24);
    const items = Array.from({ length: 10 }, (_, i) =>
      artifact({ id: `c${i}`, artifactType: "opportunity_candidate", title: `Candidate ${i}` }),
    );
    const grouped = groupArtifactsForDisplay(items);
    expect(grouped.visible).toHaveLength(10);
    expect(grouped.overflowCount).toBe(0);
    expect(grouped.artifactVisible).toBe(10);
  });

  it("shows all 17 research artifacts without hiding them behind overflow", () => {
    const items = Array.from({ length: 17 }, (_, i) =>
      artifact({
        id: `r${i}`,
        roomId: "research_department",
        artifactType: "research_packet",
        title: `Evidence packet ${i}`,
      }),
    );
    const grouped = groupArtifactsForDisplay(items);
    expect(grouped.visible).toHaveLength(17);
    expect(grouped.overflowCount).toBe(0);
  });

  it("does not treat missing records as hidden +N overflow", () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      artifact({ id: `c${i}`, artifactType: "opportunity_candidate", title: `Candidate ${i}` }),
    );
    const grouped = groupArtifactsForDisplay(items, Number.POSITIVE_INFINITY, 10);
    expect(grouped.visible).toHaveLength(3);
    expect(grouped.overflowCount).toBe(0);
    expect(grouped.missingCount).toBe(7);
    expect(grouped.artifactLoaded).toBe(3);
  });

  it("prioritizes business fields on floor display without dropping semantic content", () => {
    const candidate = artifact({
      id: "c1",
      artifactType: "opportunity_candidate",
      title: "PropTech SaaS",
      metadata: sanitizeArtifactMetadata({ score: 74.8, rank: 1 }),
    });
    const display = formatArtifactPrimaryDisplay(candidate);
    expect(display.title).toBe("PropTech SaaS");
    expect(display.metric).toBe("74.8");
    expect(display.subtitle).toBe("#1");
    expect(display.detailTitle).toContain("PropTech SaaS");
  });

  it("formats validation assumption and fatal risk delta for readable surfaces", () => {
    const assumption = artifact({
      id: "a1",
      artifactType: "assumption",
      title: "Customer acquisition cost near $518",
    });
    const decision = artifact({
      id: "d1",
      artifactType: "decision",
      title: "VALIDATE",
      metadata: sanitizeArtifactMetadata({ decision: "VALIDATE", fatalRiskBefore: 0.53, fatalRiskAfter: 0.51 }),
    });
    expect(formatArtifactPrimaryDisplay(assumption).title).toContain("$518");
    expect(formatFatalRiskDelta(decision)).toBe("0.53 → 0.51");
  });

  it("maps evidence validation result badges for floor display", () => {
    const evidence = artifact({
      id: "e1",
      artifactType: "validation_evidence",
      title: "CAC research",
      metadata: sanitizeArtifactMetadata({ validationResult: "DIRECT" }),
    });
    const display = formatArtifactPrimaryDisplay(evidence);
    expect(display.badge).toBe("DIRECT");
    expect(display.metric).toBeNull();
  });
});
