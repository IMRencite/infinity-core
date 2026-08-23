"use client";

import { abbreviateCanonicalId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import type { HqInspectionContext } from "@/lib/infinity/operator-console/inspection-context";

type Props = {
  context: HqInspectionContext;
  onClear: () => void;
};

export function InspectionContextBar({ context, onClear }: Props) {
  if (context.status === "NONE" && !context.explicit) return null;

  const typeLabel =
    context.entityType === "OPPORTUNITY_CANDIDATE"
      ? "Opportunity Candidate"
      : context.entityType === "VENTURE"
        ? "Venture"
        : "Unknown";
  const name =
    context.status === "UNAVAILABLE"
      ? "Inspection context unavailable."
      : (context.displayName ?? "No entity selected");

  return (
    <section
      className="hq-inspection-bar"
      data-hq-inspection-bar="true"
      data-inspection-status={context.status}
      data-inspection-type={context.entityType ?? "none"}
      aria-label="HQ inspection context"
    >
      <div className="hq-inspection-bar-copy">
        <p className="hq-inspection-kicker">{context.status === "UNAVAILABLE" ? "UNAVAILABLE" : "INSPECTING"}</p>
        <p className="hq-inspection-name" data-inspection-name={name}>
          {name}
        </p>
        <dl className="hq-inspection-meta">
          <div>
            <dt>Type</dt>
            <dd data-inspection-type-label>{typeLabel}</dd>
          </div>
          {context.entityId ? (
            <div>
              <dt>{context.entityType === "VENTURE" ? "Venture ID" : "Candidate ID"}</dt>
              <dd data-inspection-id={context.entityId}>{abbreviateCanonicalId(context.entityId)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
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
    </section>
  );
}
