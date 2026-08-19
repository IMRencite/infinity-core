import { randomUUID } from "node:crypto";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import type { FounderDecisionOverride, FounderIdeaGrade, FounderIdeaSubmission } from "./types";
import type { FounderBuildRouteResult } from "./types";

export class FounderIdeaStore {
  submissions = new Map<string, FounderIdeaSubmission>();
  candidates = new Map<string, OpportunityCandidate>();
  grades = new Map<string, FounderIdeaGrade>();
  overrides = new Map<string, FounderDecisionOverride>();
  builds = new Map<string, FounderBuildRouteResult>();
  idempotency = new Map<string, string>();
  approvalIdempotency = new Map<string, string>();

  private key(orgId: string, idempotencyKey: string): string {
    return `${orgId}:${idempotencyKey}`;
  }

  findByIdempotency(organizationId: string, idempotencyKey: string): FounderIdeaSubmission | null {
    const id = this.idempotency.get(this.key(organizationId, idempotencyKey));
    if (!id) return null;
    return this.submissions.get(id) ?? null;
  }

  registerIdempotency(organizationId: string, idempotencyKey: string, id: string): void {
    this.idempotency.set(this.key(organizationId, idempotencyKey), id);
  }

  scoped(organizationId: string): FounderIdeaSubmission[] {
    return [...this.submissions.values()].filter((row) => row.organizationId === organizationId);
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
