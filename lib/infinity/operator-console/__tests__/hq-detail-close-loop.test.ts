import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyHqDetailClose,
  applyHqDetailOpen,
  createHqDetailSession,
  isDismissedStaleUrl,
  settleHqDetailUrl,
  shouldCommitDetailResponse,
  shouldOpenFromUrl,
  shouldRestoreSelectionFromSnapshot,
} from "@/lib/infinity/operator-console/artifacts/hq-detail-session";
import { formatDetailQueryParam, parseDetailQueryParam } from "@/lib/infinity/operator-console/details/build-entity-detail";

const ARTIFACTS = join(process.cwd(), "components/dashboard/operator-console/artifacts");

function readSource(name: string): string {
  return readFileSync(join(ARTIFACTS, name), "utf8");
}

describe("HQ detail close / reopen loop", () => {
  it("opens from canonical and legacy deep-link queries", () => {
    expect(parseDetailQueryParam("artifact:A")).toEqual({ kind: "artifact", id: "A" });
    expect(parseDetailQueryParam("A")).toEqual({ kind: "artifact", id: "A" });
    expect(formatDetailQueryParam("A")).toBe("artifact:A");

    const deepLink = createHqDetailSession(null);
    expect(shouldOpenFromUrl(deepLink, "artifact:A", false)).toBe("A");
    expect(shouldOpenFromUrl(createHqDetailSession(null), "A", false)).toBe("A");
    expect(shouldOpenFromUrl(createHqDetailSession(null), "opp:c3", false)).toBe("opp:c3");
  });

  it("X/Escape/backdrop close clears selection and ignores stale URL", () => {
    let session = applyHqDetailOpen(createHqDetailSession(), "A");
    expect(session.selectedArtifactId).toBe("A");
    expect(session.requestedArtifactId).toBe("A");

    session = applyHqDetailClose(session, "artifact:A");
    expect(session.selectedArtifactId).toBeNull();
    expect(session.requestedArtifactId).toBeNull();
    expect(session.dismissedQuery).toBe("artifact:A");
    expect(isDismissedStaleUrl(session, "artifact:A")).toBe(true);
    expect(shouldOpenFromUrl(session, "artifact:A", false)).toBeNull();
    expect(shouldOpenFromUrl(session, "A", false)).toBeNull();
    expect(shouldRestoreSelectionFromSnapshot(session.selectedArtifactId)).toBe(false);
  });

  it("does not reopen after URL catch-up and snapshot refresh", () => {
    let session = applyHqDetailClose(applyHqDetailOpen(createHqDetailSession(), "A"), "artifact:A");
    expect(shouldOpenFromUrl(session, "artifact:A", false)).toBeNull();

    session = settleHqDetailUrl(session, null);
    expect(session.dismissedQuery).toBe("artifact:A");
    expect(shouldOpenFromUrl(session, null, false)).toBeNull();
    expect(shouldOpenFromUrl(session, "artifact:A", false)).toBeNull();
    expect(shouldRestoreSelectionFromSnapshot(null)).toBe(false);
  });

  it("legacy query close stays closed until a new open intent", () => {
    let session = applyHqDetailClose(applyHqDetailOpen(createHqDetailSession(), "A"), "A");
    expect(shouldOpenFromUrl(session, "A", false)).toBeNull();
    expect(shouldOpenFromUrl(session, "artifact:A", false)).toBeNull();
    session = settleHqDetailUrl(session, null);
    expect(shouldOpenFromUrl(session, "artifact:A", false)).toBeNull();
    session = applyHqDetailOpen(session, "A");
    expect(session.selectedArtifactId).toBe("A");
    expect(session.dismissedQuery).toBeNull();
  });

  it("a different deep-link id after close is a new open intent", () => {
    let session = applyHqDetailClose(applyHqDetailOpen(createHqDetailSession(), "A"), "artifact:A");
    session = settleHqDetailUrl(session, "artifact:B");
    expect(session.dismissedQuery).toBeNull();
    expect(shouldOpenFromUrl(session, "artifact:B", false)).toBe("B");
  });

  it("intentional click after close can reopen the same artifact", () => {
    const closed = applyHqDetailClose(applyHqDetailOpen(createHqDetailSession(), "A"), "artifact:A");
    const reopened = applyHqDetailOpen(closed, "A");
    expect(reopened.selectedArtifactId).toBe("A");
    expect(reopened.requestedArtifactId).toBe("A");
    expect(reopened.dismissedQuery).toBeNull();
    expect(shouldOpenFromUrl(reopened, "artifact:A", true)).toBeNull();
  });

  it("late response after close does not commit", () => {
    const opened = applyHqDetailOpen(createHqDetailSession(), "A");
    const closed = applyHqDetailClose(opened, "artifact:A");
    expect(
      shouldCommitDetailResponse({
        activeGeneration: closed.requestGeneration,
        responseGeneration: opened.requestGeneration,
        selectedArtifactId: closed.selectedArtifactId,
        requestedArtifactId: closed.requestedArtifactId,
        responseArtifactId: "A",
      }),
    ).toBe(false);
  });

  it("fast A→B switch ignores A's late response and stale URL for A", () => {
    const openedA = applyHqDetailOpen(createHqDetailSession(), "A");
    const openedB = applyHqDetailOpen(openedA, "B");
    expect(openedB.selectedArtifactId).toBe("B");
    expect(openedB.requestedArtifactId).toBe("B");
    expect(
      shouldCommitDetailResponse({
        activeGeneration: openedB.requestGeneration,
        responseGeneration: openedA.requestGeneration,
        selectedArtifactId: openedB.selectedArtifactId,
        requestedArtifactId: openedB.requestedArtifactId,
        responseArtifactId: "A",
      }),
    ).toBe(false);
    expect(
      shouldCommitDetailResponse({
        activeGeneration: openedB.requestGeneration,
        responseGeneration: openedB.requestGeneration,
        selectedArtifactId: openedB.selectedArtifactId,
        requestedArtifactId: openedB.requestedArtifactId,
        responseArtifactId: "B",
      }),
    ).toBe(true);
    expect(shouldOpenFromUrl(openedB, "artifact:A", true)).toBeNull();
  });

  it("wires a single authoritative close path with abort and URL guards", () => {
    const provider = readSource("hq-artifact-inspector-provider.tsx");
    const shell = readSource("hq-output-detail.tsx");
    const modal = readSource("artifact-inspector-modal.tsx");
    const consoleSource = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/venture-operator-console.tsx"),
      "utf8",
    );

    expect(provider).toContain("closeHQDetail");
    expect(provider).toContain("AbortController");
    expect(provider).toContain("shouldOpenFromUrl");
    expect(provider).toContain("shouldCommitDetailResponse");
    expect(provider).toContain("applyHqDetailClose");
    expect(modal).toContain("onClose={closeInspector}");
    expect(shell).toContain("onClose()");
    expect(shell).toContain("Escape");
    expect(shell).toContain("event.target === event.currentTarget");
    expect(shell).toContain("event.stopPropagation()");
    expect(shell).toContain('type="button"');
    expect(consoleSource).toContain("params.delete(\"artifact\")");
    expect(consoleSource).toContain("params.delete(\"detail\")");
  });
});
