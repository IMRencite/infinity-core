"use client";

import type { ReactNode } from "react";
import { abbreviateCanonicalId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import type { CommandNowInspecting } from "@/lib/infinity/mission-activity/types";
import type { HqInspectionContext } from "@/lib/infinity/operator-console/inspection-model";
import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  VENTURE_DESCRIPTION_FALLBACK,
  usefulVentureDescription,
  type InspectedVentureIdentity,
} from "@/lib/infinity/operator-console/inspected-venture-identity";

export type CanonicalVentureContext = {
  name: string;
  id: string;
  originLabel?: string | null;
};

type Props = {
  context: HqInspectionContext;
  onClear: () => void;
  overallStatus?: string | null;
  canonicalVenture?: CanonicalVentureContext | null;
  selector?: ReactNode;
  identity?: InspectedVentureIdentity | null;
  nowInspecting?: CommandNowInspecting | null;
};

function typeLabel(context: HqInspectionContext): string {
  if (context.entityType === "OPPORTUNITY_CANDIDATE") return "Opportunity Candidate";
  if (context.entityType === "VENTURE") return "Venture";
  return "Unknown";
}

function inspectedDiffersFromCanonical(
  context: HqInspectionContext,
  canonical: CanonicalVentureContext | null | undefined,
  inspectedName: string,
): boolean {
  if (!canonical || context.status !== "ACTIVE") return false;
  if (context.entityType === "OPPORTUNITY_CANDIDATE") return true;
  if (context.entityId && !hqVentureIdentitiesMatch(context.entityId, canonical.id)) return true;
  if (inspectedName && inspectedName !== canonical.name) return true;
  return false;
}

function CopyableId({ id, label }: { id: string; label: string }) {
  return (
    <button
      type="button"
      className="hq-venture-id-copy"
      data-hq-copy-id={id}
      onClick={() => {
        void navigator.clipboard?.writeText(id);
      }}
    >
      <span className="sr-only">Copy {label}</span>
      {label}: {abbreviateCanonicalId(id)}
    </button>
  );
}

export function InspectionContextBar({
  context,
  onClear,
  overallStatus = null,
  canonicalVenture = null,
  selector = null,
  identity = null,
  nowInspecting = null,
}: Props) {
  if (context.status === "NONE" && !context.explicit && !canonicalVenture && !selector) return null;

  const unavailable = context.status === "UNAVAILABLE";
  const usingFallback = context.status === "NONE" && !context.explicit;
  const name = unavailable
    ? "Inspection context unavailable."
    : usingFallback
      ? (canonicalVenture?.name ?? "No entity selected")
      : (context.displayName ?? canonicalVenture?.name ?? identity?.ventureId ?? "No entity selected");
  const entityType = usingFallback ? "VENTURE" : context.entityType;
  const entityId = usingFallback ? canonicalVenture?.id ?? null : context.entityId;
  const objectType = usingFallback ? "Venture" : typeLabel(context);
  const sourceLabel = identity?.sourceLabel ?? context.origin ?? objectType;
  const showCanonical = inspectedDiffersFromCanonical(context, canonicalVenture, name);
  const description = unavailable
    ? null
    : usefulVentureDescription(identity?.description) ?? (usingFallback || context.status === "ACTIVE" ? VENTURE_DESCRIPTION_FALLBACK : null);
  const statuses = [
    identity?.stageLabel ? { label: "Stage", value: identity.stageLabel } : context.stage ? { label: "Stage", value: context.stage } : null,
    identity?.businessCase ? { label: "Business case", value: identity.businessCase } : null,
    identity?.buildReadiness ? { label: "Build readiness", value: identity.buildReadiness } : null,
    !identity?.stageLabel && !context.stage && overallStatus && !unavailable
      ? { label: "Status", value: overallStatus }
      : null,
    nowInspecting?.currentMission ? { label: "Current mission", value: nowInspecting.currentMission } : null,
    nowInspecting?.currentPhase ? { label: "Current phase", value: nowInspecting.currentPhase } : null,
    nowInspecting?.currentStep ? { label: "Current step", value: nowInspecting.currentStep } : null,
    nowInspecting?.currentRooms?.length
      ? { label: "Active rooms", value: nowInspecting.currentRooms.join(" · ") }
      : nowInspecting?.currentRoom
        ? { label: "Room", value: nowInspecting.currentRoom }
        : null,
    nowInspecting?.currentWorker ? { label: "Worker", value: nowInspecting.currentWorker } : null,
    nowInspecting?.currentTask ? { label: "Task", value: nowInspecting.currentTask } : null,
    nowInspecting?.status ? { label: "Status", value: nowInspecting.status } : null,
    nowInspecting?.why ? { label: "Why", value: nowInspecting.why } : null,
    nowInspecting?.startedAt ? { label: "Started", value: nowInspecting.startedAt } : null,
    nowInspecting?.lastActivity ? { label: "Last activity", value: nowInspecting.lastActivity } : null,
    nowInspecting?.nextExpectedStep ? { label: "Next step", value: nowInspecting.nextExpectedStep } : null,
    nowInspecting?.blocker ? { label: "Blocker", value: nowInspecting.blocker } : null,
    nowInspecting?.authorizationRequired
      ? { label: "Authorization", value: nowInspecting.authorizationRequired }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <section
      className="hq-inspection-bar hq-venture-identity-banner"
      data-hq-inspection-bar="true"
      data-hq-region="inspecting"
      data-hq-venture-identity="true"
      data-inspection-status={usingFallback ? "ACTIVE" : context.status}
      data-inspection-type={entityType ?? "none"}
      aria-label="Now inspecting venture identity"
    >
      <div className="hq-inspection-bar-copy">
        <p className="hq-inspection-kicker">NOW INSPECTING</p>
        <h2 className="hq-inspection-name" data-inspection-name={name}>
          {name}
        </h2>
        <p className="hq-venture-identity-source" data-inspection-type-label>
          <span>{sourceLabel}</span>
          {sourceLabel !== objectType ? <span> · {objectType}</span> : null}
        </p>
        {description ? (
          <p className="hq-venture-identity-description" data-hq-venture-description="true">
            {description}
          </p>
        ) : null}
        {statuses.length ? (
          <ul className="hq-venture-identity-status" data-hq-venture-status="true">
            {statuses.map((item) => (
              <li key={item.label}>
                <span className="hq-venture-identity-status-label">{item.label}</span>
                <span data-inspection-status-label={item.value}>
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {showCanonical && canonicalVenture ? (
          <div className="hq-inspection-canonical" data-hq-canonical-venture="true">
            <p className="hq-inspection-kicker">Canonical venture</p>
            <p className="hq-inspection-canonical-name">{canonicalVenture.name}</p>
            <p className="hq-inspection-canonical-meta">
              This inspection is the source object. Venture Intelligence below is for this related canonical venture.
            </p>
          </div>
        ) : null}
        <details className="hq-venture-identity-ids">
          <summary>Technical IDs</summary>
          <div className="hq-venture-identity-id-row">
            {entityId ? (
              <CopyableId id={entityId} label={entityType === "VENTURE" ? "Venture ID" : "Candidate ID"} />
            ) : null}
            {identity?.candidateId && identity.candidateId !== entityId ? (
              <CopyableId id={identity.candidateId} label="Candidate ID" />
            ) : null}
            {identity?.ventureId && identity.ventureId !== entityId ? (
              <CopyableId id={identity.ventureId} label="Venture ID" />
            ) : null}
            <span data-inspection-id={entityId ?? ""} hidden>
              {entityId ? abbreviateCanonicalId(entityId) : ""}
            </span>
          </div>
        </details>
      </div>
      <div className="hq-inspection-bar-actions">
        {selector}
        {context.explicit ? (
          <button
            type="button"
            className="hq-inspection-clear"
            data-hq-inspection-clear="true"
            onClick={onClear}
          >
            Clear inspection
          </button>
        ) : null}
      </div>
    </section>
  );
}
