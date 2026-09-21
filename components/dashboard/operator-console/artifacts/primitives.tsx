"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { HqArtifactState, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { artifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import { formatArtifactPrimaryDisplay, formatFatalRiskDelta } from "@/lib/infinity/operator-console/artifacts/artifact-display";
import { LineageMarker, lineageClassForArtifact, lineageStyleForArtifact } from "./lineage-accent";
import { useOptionalHqArtifactInspector } from "./hq-artifact-inspector-provider";
import { useOptionalHqInspection } from "../hq-inspection-provider";
import { handleCardKeyboardInspect } from "../infinity-room/room-keyboard";
import { readHqCandidateId } from "@/lib/infinity/operator-console/architecture-entity";
import { inspectionRefFromOpportunityArtifact } from "@/lib/infinity/operator-console/inspection-filter";
import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  isCompactDecisionToken,
  preferredCircularOrb,
  splitCircularOutput,
  usesCircularFloorOutput,
} from "@/lib/infinity/hq-room-presentation/primitives";
import { buildOpportunityOrbPresentation } from "@/lib/infinity/hq-room-presentation/opportunity-orb";

const STATE_CLASS: Record<HqArtifactState, string> = {
  CREATING: "hq-artifact-card hq-artifact-card--creating",
  READY: "hq-artifact-card hq-artifact-card--ready",
  SELECTED: "hq-artifact-card hq-artifact-card--selected",
  REJECTED: "hq-artifact-card hq-artifact-card--rejected",
  ARCHIVED: "hq-artifact-card hq-artifact-card--archived",
  FAILED: "hq-artifact-card hq-artifact-card--failed",
};

function shapeClass(artifact: HqWorkArtifact): string {
  if (artifact.artifactType === "research_packet") return "hq-artifact-card--research-packet";
  if (artifact.artifactType === "source_cluster") return "hq-artifact-card--source-cluster";
  if (artifact.artifactType === "assumption") return "hq-artifact-card--assumption";
  return "";
}

function titleClampClass(artifact: HqWorkArtifact): string {
  if (artifact.sourceRecordType === "growth_strategy" || artifact.artifactType === "learning_decision") {
    return "";
  }
  if (artifact.artifactType === "assumption" || artifact.artifactType === "opportunity_candidate") {
    return "line-clamp-3";
  }
  if (artifact.artifactType === "monetization_plan" || artifact.artifactType === "selection_blueprint") {
    return "line-clamp-2";
  }
  return "line-clamp-2";
}

function decisionToneClass(decision: string): string {
  if (decision === "BUILD") return "hq-decision-token hq-decision-token--build";
  if (decision === "VALIDATE") return "hq-decision-token hq-decision-token--validate";
  if (decision === "REJECT") return "hq-decision-token hq-decision-token--reject";
  if (decision === "HOLD") return "hq-decision-token hq-decision-token--hold";
  return "hq-decision-token";
}

type ArtifactCardProps = {
  artifact: HqWorkArtifact;
  onInspect?: (artifact: HqWorkArtifact) => void;
};

export function HQOpportunityOrb({
  presentation,
}: {
  presentation: ReturnType<typeof buildOpportunityOrbPresentation>;
}) {
  const tone = presentation.selected
    ? "hq-opportunity-orb--selected"
    : presentation.shortlisted
      ? "hq-opportunity-orb--shortlisted"
      : "hq-opportunity-orb--ready";
  return (
    <div
      className="hq-circular-output hq-opportunity-output"
      data-hq-opportunity-orb="true"
      data-hq-visual-form="CIRCULAR_OUTPUT"
      aria-label={`${presentation.rankLabel} ${presentation.fullTitle} score ${presentation.scoreLabel} ${presentation.monetizationLabel} ${presentation.stateLabel}`}
    >
      <div className={`hq-circular-orb hq-opportunity-orb ${tone}`} data-hq-circular-orb="true">
        <span className="hq-opportunity-orb__rank">{presentation.rankLabel}</span>
        <span className="hq-opportunity-orb__score">{presentation.scoreLabel}</span>
        <span className="hq-opportunity-orb__name">{presentation.shortTitle}</span>
        <span className="hq-opportunity-orb__state">{presentation.stateLabel}</span>
      </div>
      <div className="hq-circular-output-detail" data-hq-output-detail="true">
        <p className="font-medium text-[var(--hq-text-primary)]">{presentation.fullTitle}</p>
        <p className="mt-1 text-[var(--hq-text-secondary)]">{presentation.monetizationLabel}</p>
        <p className="hq-status-badge mt-2">{presentation.stateLabel}</p>
      </div>
    </div>
  );
}

export function HQCircularOutputNode({
  orb,
  detail,
  state,
}: {
  orb: string;
  detail?: string | null;
  state?: HqArtifactState;
}) {
  return (
    <div className="hq-circular-output" data-hq-circular-output="true" data-hq-visual-form="CIRCULAR_OUTPUT">
      <div
        className={`hq-circular-orb ${state ? `hq-circular-orb--${state.toLowerCase()}` : ""}`}
        data-hq-circular-orb="true"
      >
        {orb}
      </div>
      {detail ? (
        <p className="hq-circular-output-detail hq-long-form-value" data-hq-output-detail="true">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function DecisionBadge({ artifact, large = false }: { artifact: HqWorkArtifact; large?: boolean }) {
  const decision = String(artifact.metadata.decision ?? artifact.title);
  const riskDelta = formatFatalRiskDelta(artifact);
  const lineageClass = lineageClassForArtifact(artifact);
  const lineageStyle = lineageStyleForArtifact(artifact);

  return (
    <span
      style={lineageStyle}
      className={`${decisionToneClass(decision)} ${lineageClass} ${large ? "hq-decision-token--large" : ""} pointer-events-none inline-flex flex-col`}
    >
      <span className="flex items-center gap-1.5">
        <LineageMarker artifact={artifact} compact />
        <span>{decision}</span>
      </span>
      {riskDelta && large ? (
        <span className="mt-1 block text-[11px] font-semibold normal-case tracking-normal text-amber-100">
          Fatal {riskDelta}
        </span>
      ) : null}
    </span>
  );
}

export function ArtifactCard({ artifact, onInspect }: ArtifactCardProps) {
  const router = useRouter();
  const inspector = useOptionalHqArtifactInspector();
  const inspection = useOptionalHqInspection();
  const display = formatArtifactPrimaryDisplay(artifact);
  const riskDelta = formatFatalRiskDelta(artifact);
  const stateClass = STATE_CLASS[artifact.state];
  const lineageClass = lineageClassForArtifact(artifact);
  const lineageStyle = lineageStyleForArtifact(artifact);
  const selectedLineage = artifact.state === "SELECTED" && artifact.lineageColorKey ? "hq-lineage-selected" : "";
  const href = typeof artifact.metadata.href === "string" ? artifact.metadata.href : null;
  const universeCard = artifact.metadata.universe === true;
  const inspectionRef = universeCard ? null : inspectionRefFromOpportunityArtifact(artifact);
  const inspecting =
    inspection?.context.status === "ACTIVE" &&
    hqVentureIdentitiesMatch(inspection.context.entityId, readHqCandidateId(artifact));
  const handleInspect = () => {
    if (href && (universeCard || artifact.sourceRecordType === "opportunity_universe")) {
      router.push(href);
      return;
    }
    if (inspectionRef) inspection?.selectInspection(inspectionRef);
    if (onInspect) onInspect(artifact);
    else if (!inspectionRef) inspector?.openInspector(artifact);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => handleCardKeyboardInspect(event, handleInspect);
  const opportunityOrb = artifact.artifactType === "opportunity_candidate" && !universeCard;
  const circular = usesCircularFloorOutput(artifact.artifactType, artifact.sourceRecordType, artifact.metadata);
  const opportunityPresentation = opportunityOrb
    ? buildOpportunityOrbPresentation({
        title: display.title,
        rank: typeof artifact.metadata.rank === "number" || typeof artifact.metadata.rank === "string" ? artifact.metadata.rank : null,
        opportunityScore: typeof artifact.metadata.score === "boolean" ? null : artifact.metadata.score,
        monetizationScore: typeof artifact.metadata.monetizationScore === "boolean" ? null : artifact.metadata.monetizationScore,
        selected: artifact.metadata.selected === true || artifact.state === "SELECTED",
        shortlisted: artifact.metadata.shortlisted === true,
        lifecycle: typeof artifact.metadata.lifecycle === "string" ? artifact.metadata.lifecycle : typeof artifact.metadata.status === "string" ? artifact.metadata.status : null,
        selectionState: typeof artifact.metadata.selectionState === "string" ? artifact.metadata.selectionState : null,
      })
    : null;
  const circularParts = !opportunityOrb && circular
    ? splitCircularOutput(
        display.title,
        display.subtitle,
        preferredCircularOrb({
          artifactType: artifact.artifactType,
          title: display.title,
          status: typeof artifact.metadata.status === "string" ? artifact.metadata.status : display.title,
          confidence: typeof artifact.metadata.confidence === "string" ? artifact.metadata.confidence : null,
          typeLabel: typeof artifact.metadata.type === "string" ? artifact.metadata.type : null,
        }),
      )
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      title={inspectionRef ? `${display.detailTitle} — Inspect opportunity` : `${display.detailTitle} — Inspect`}
      aria-pressed={inspecting || undefined}
      data-hq-inspecting={inspecting ? "true" : "false"}
      data-hq-inspection-card={inspectionRef ? "opportunity_candidate" : undefined}
      data-canonical-universe-card={universeCard ? "true" : undefined}
      data-opportunity-href={href ?? undefined}
      data-hq-visual-form={opportunityOrb || circular ? "CIRCULAR_OUTPUT" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        handleInspect();
      }}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        event.currentTarget.scrollIntoView({ block: "nearest" });
      }}
      style={lineageStyle}
      className={`${opportunityOrb || circular ? "hq-circular-output-host" : `${stateClass} ${shapeClass(artifact)}`} ${lineageClass} ${selectedLineage} ${inspecting ? "hq-artifact-card--inspecting" : ""} hq-artifact-card--clickable hq-artifact-card--rail group relative min-h-0 min-w-0 w-full cursor-pointer ${opportunityOrb || circular ? "px-1 py-1" : "px-2.5 py-2"} text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50`}
    >
      {opportunityOrb || circular ? null : (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden />
      )}
      {opportunityPresentation ? (
        <HQOpportunityOrb presentation={opportunityPresentation} />
      ) : circularParts ? (
        <HQCircularOutputNode orb={circularParts.orb} detail={circularParts.detail} state={artifact.state} />
      ) : (
        <>
      <div className="relative mb-1.5 flex items-start justify-between gap-1">
        <LineageMarker artifact={artifact} compact />
        {display.metric && artifact.artifactType === "opportunity_candidate" ? (
          <span className="hq-artifact-metric hq-artifact-metric--score">{display.metric}</span>
        ) : null}
      </div>
      <p className={`relative text-[var(--hq-artifact-title-size)] font-semibold leading-snug text-[var(--hq-text-primary)] ${titleClampClass(artifact)}`}>
        {display.title}
      </p>
        </>
      )}
      {inspecting ? (
        <p className="hq-inspection-chip" data-hq-inspecting-label="true">
          Inspecting
        </p>
      ) : null}
      {opportunityPresentation || circularParts
        ? null
        : display.subtitle ? (
        <p
          className={`relative mt-1 text-[var(--hq-artifact-subtitle-size)] text-[var(--hq-text-secondary)] ${
            artifact.artifactType === "monetization_plan" ||
            artifact.sourceRecordType === "growth_strategy" ||
            artifact.artifactType === "learning_decision"
              ? "font-medium"
              : "line-clamp-2"
          }`}
        >
          {display.subtitle}
        </p>
      ) : null}
      {artifact.artifactType === "source_cluster" ? (
        <div className="relative mt-2 flex items-center gap-0.5" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400/70" />
          <span className="h-px w-2 bg-sky-400/40" />
          <span className="h-2 w-2 rounded-full bg-violet-400/70" />
          <span className="h-px w-2 bg-violet-400/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
        </div>
      ) : null}
      {opportunityPresentation ? null : circularParts ? (
        display.badge && display.badge !== circularParts.detail && display.badge !== circularParts.orb ? (
          <span className={display.badge.length > 36 ? "hq-circular-output-detail" : "hq-status-badge"}>{display.badge}</span>
        ) : null
      ) : (
      <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
        {display.badge && artifact.artifactType === "selection_blueprint" ? (
          <DecisionBadge artifact={{ ...artifact, metadata: { ...artifact.metadata, decision: display.badge } }} />
        ) : null}
        {display.metric && artifact.artifactType !== "decision" && artifact.artifactType !== "opportunity_candidate" ? (
          <span className={display.metric.length > 36 ? "hq-output-card" : "hq-metric-badge"}>{display.metric}</span>
        ) : null}
        {display.badge && artifact.artifactType !== "selection_blueprint" ? (
          <span className={display.badge.length > 36 ? "hq-output-card" : "hq-status-badge"}>{display.badge}</span>
        ) : null}
      </div>
      )}
      {riskDelta ? (
        <p className="relative mt-2 text-[var(--hq-artifact-metric-size)] font-bold tabular-nums tracking-wide text-amber-100">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">Fatal risk</span>
          {riskDelta}
        </p>
      ) : null}
    </div>
  );
}

export function DecisionToken({ artifact, large = false }: { artifact: HqWorkArtifact; large?: boolean }) {
  const inspector = useOptionalHqArtifactInspector();
  const decision = String(artifact.metadata.decision ?? artifact.title);
  const tone = decisionToneClass(decision);
  const riskDelta = formatFatalRiskDelta(artifact);
  const lineageClass = lineageClassForArtifact(artifact);
  const lineageStyle = lineageStyleForArtifact(artifact);
  const open = () => inspector?.openInspector(artifact);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => handleCardKeyboardInspect(event, open);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
      onKeyDown={onKeyDown}
      data-hq-validation-token={decision === "VALIDATE" ? "true" : "false"}
      style={lineageStyle}
      className={`${tone} ${lineageClass} ${large ? "hq-decision-token--large" : ""} hq-artifact-card--clickable min-w-0 w-full cursor-pointer ${artifact.state === "CREATING" ? "hq-artifact-creating" : ""} focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50`}
    >
      <span className="flex items-center gap-1.5">
        <LineageMarker artifact={artifact} compact />
        <span>{decision}</span>
      </span>
      {riskDelta && large ? (
        <span className="mt-1 block text-[11px] font-semibold normal-case tracking-normal text-amber-100">
          Fatal {riskDelta}
        </span>
      ) : null}
    </div>
  );
}

export function ArtifactOverflowBadge({
  count,
  onExpand,
}: {
  count: number;
  onExpand?: () => void;
}) {
  if (count <= 0) return null;
  const expand = onExpand
    ? (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onExpand();
      }
    : undefined;
  return (
    <span
      role={onExpand ? "button" : undefined}
      tabIndex={onExpand ? 0 : undefined}
      aria-label={onExpand ? `Show ${count} more artifacts` : `${count} more artifacts`}
      title={onExpand ? `Show ${count} more artifacts` : undefined}
      onClick={expand}
      onKeyDown={
        onExpand
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onExpand();
              }
            }
          : undefined
      }
      className="hq-artifact-overflow inline-flex min-h-[4.5rem] min-w-[3.5rem] shrink-0 cursor-pointer items-center justify-center px-2.5 text-[13px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
    >
      +{count}
    </span>
  );
}

export function ArtifactCompletenessNote({
  loaded,
  expected,
}: {
  loaded: number;
  expected: number | null;
}) {
  if (expected == null || expected <= loaded) return null;
  return (
    <p className="hq-artifact-incomplete mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-200/75">
      {loaded} of {expected} available
    </p>
  );
}

export function ArtifactStack({
  artifacts,
  overflowCount,
  isActive = false,
  onExpandOverflow,
}: {
  artifacts: HqWorkArtifact[];
  overflowCount: number;
  compact?: boolean;
  isActive?: boolean;
  onExpandOverflow?: () => void;
}) {
  if (artifacts.length === 0 && overflowCount === 0) return null;

  return (
    <div
      className={`hq-artifact-stack hq-artifact-grid ${isActive ? "hq-artifact-stack-active" : ""}`}
      aria-label={`${artifacts.length + overflowCount} persisted work artifacts`}
    >
      {artifacts.map((artifact) =>
        artifact.artifactType === "decision" &&
        isCompactDecisionToken(String(artifact.metadata.decision ?? "")) ? (
          <DecisionToken key={artifactRenderId(artifact)} artifact={artifact} large />
        ) : (
          <ArtifactCard key={artifactRenderId(artifact)} artifact={artifact} />
        ),
      )}
      <ArtifactOverflowBadge count={overflowCount} onExpand={onExpandOverflow} />
    </div>
  );
}

export function EvidenceNode({ artifact }: { artifact: HqWorkArtifact }) {
  const display = formatArtifactPrimaryDisplay(artifact);
  return (
    <div
      className={`hq-evidence-node flex min-h-[2.25rem] items-center gap-1.5 px-2.5 py-1.5 ${lineageClassForArtifact(artifact)}`}
      style={lineageStyleForArtifact(artifact)}
    >
      <LineageMarker artifact={artifact} compact />
      <span className="h-2 w-2 rounded-full bg-[var(--hq-neon-cyan)] shadow-[var(--hq-glow-ready)]" aria-hidden />
      <span className="max-w-[12rem] text-[12px] leading-snug text-[var(--hq-text-primary)] line-clamp-2">{display.title}</span>
      {display.badge ? <span className="hq-evidence-badge">{display.badge}</span> : null}
    </div>
  );
}
