import { describe, expect, it } from "vitest";
import { buildWorkerNodes } from "@/lib/infinity/operator-console/worker-nodes";
import type { OperatorDepartmentSnapshot, OperatorProviderSession } from "@/lib/infinity/operator-console/types";

function dept(partial: Partial<OperatorDepartmentSnapshot>): OperatorDepartmentSnapshot {
  return {
    id: "quality_control",
    label: "Quality Control",
    state: "RUNNING",
    engines: ["validation_engine"],
    summary: null,
    currentTask: "Reviewing existing evidence",
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: 0,
    detail: {},
    isActive: true,
    isNextMissionTarget: false,
    ...partial,
  };
}

describe("HQ live motion semantics", () => {
  it("does not render worker for synthesis-only active validation", () => {
    const departments = [
      dept({ detail: { showWorkers: false, validationStation: true }, currentTask: "Reviewing existing evidence — no new provider research" }),
    ];
    const nodes = buildWorkerNodes([], departments);
    expect(nodes).toHaveLength(0);
  });

  it("allows worker when provider session exists", () => {
    const providers: OperatorProviderSession[] = [
      {
        sessionId: "research-1",
        departmentId: "quality_control",
        engine: "bounded_validation",
        role: "RESEARCH_PROVIDER",
        provider: "gemini",
        model: "gemini-3",
        status: "running",
        task: "Researching new evidence for customer acquisition cost",
        costUsd: 0.001,
        costKnown: true,
        startedAt: null,
        filesChanged: [],
      },
    ];
    const departments = [dept({ detail: { showWorkers: true, validationStation: true } })];
    const nodes = buildWorkerNodes(providers, departments);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.motionActive).toBe(true);
  });

  it("does not keep active worker when department completes", () => {
    const providers: OperatorProviderSession[] = [
      {
        sessionId: "research-1",
        departmentId: "quality_control",
        engine: "bounded_validation",
        role: "RESEARCH_PROVIDER",
        provider: "gemini",
        model: "gemini-3",
        status: "completed",
        task: "Done",
        costUsd: 0.001,
        costKnown: true,
        startedAt: null,
        filesChanged: [],
      },
    ];
    const departments = [dept({ state: "COMPLETE", isActive: false, detail: { showWorkers: false } })];
    const nodes = buildWorkerNodes(providers, departments);
    expect(nodes.filter((node) => node.isActive)).toHaveLength(0);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.motionActive).toBe(false);
    expect(nodes[0]?.isDormant).toBe(true);
  });
});
