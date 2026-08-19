import { randomUUID } from "node:crypto";
import type { BuildGraph, BuildPackageDraft, VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { LaunchReadinessReport, ZeroToProductionEvent, ZeroToProductionRun, ZeroToProductionStageRun } from "./types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import type { FounderIdeaGrade } from "@/lib/infinity/founder-idea-lab/types";

export class ZeroToProductionStore {
  runs = new Map<string, ZeroToProductionRun>();
  stages = new Map<string, ZeroToProductionStageRun>();
  events: ZeroToProductionEvent[] = [];
  blueprints = new Map<string, VentureBlueprintDraft>();
  packages = new Map<string, BuildPackageDraft>();
  graphs = new Map<string, BuildGraph>();
  launchReports = new Map<string, LaunchReadinessReport>();
  autonomousCandidates = new Map<string, OpportunityCandidate>();
  autonomousGrades = new Map<string, FounderIdeaGrade>();
  idempotency = new Map<string, string>();

  private key(orgId: string, idempotencyKey: string): string {
    return `${orgId}:${idempotencyKey}`;
  }

  findByIdempotency(organizationId: string, idempotencyKey: string): ZeroToProductionRun | null {
    const id = this.idempotency.get(this.key(organizationId, idempotencyKey));
    if (!id) return null;
    return this.runs.get(id) ?? null;
  }

  registerIdempotency(organizationId: string, idempotencyKey: string, id: string): void {
    this.idempotency.set(this.key(organizationId, idempotencyKey), id);
  }

  scoped(organizationId: string): ZeroToProductionRun[] {
    return [...this.runs.values()].filter((run) => run.organizationId === organizationId);
  }

  stagesFor(runId: string): ZeroToProductionStageRun[] {
    return [...this.stages.values()].filter((row) => row.ztpRunId === runId);
  }

  stage(runId: string, stage: ZeroToProductionStageRun["stage"]): ZeroToProductionStageRun | null {
    return this.stagesFor(runId).find((row) => row.stage === stage) ?? null;
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
