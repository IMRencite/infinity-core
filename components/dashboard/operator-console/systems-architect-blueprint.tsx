"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  selectSystemsArchitectNode,
  type SystemsArchitectCluster,
  type SystemsArchitectEdge,
  type SystemsArchitectHqView,
  type SystemsArchitectNode,
  type SystemsArchitectNodeStatus,
  type SystemsArchitectSpineIndicator,
} from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { abbreviateCanonicalId } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";

type Props = {
  view: SystemsArchitectHqView;
  compact?: boolean;
};

type DetailProps = {
  view: SystemsArchitectHqView;
  onClose?: () => void;
};

export function resetSystemsArchitectInspectorScroll(element: { scrollTop: number } | null): void {
  if (element) element.scrollTop = 0;
}

function statusClass(status: SystemsArchitectNodeStatus | SystemsArchitectSpineIndicator): string {
  return `systems-architect-dot--${status.toLowerCase().replace(/_/g, "-")}`;
}

function relatedNodeIds(selectedId: string | null, edges: SystemsArchitectEdge[]): Set<string> {
  const related = new Set<string>();
  if (!selectedId) return related;
  related.add(selectedId);
  for (const edge of edges) {
    if (edge.kind !== "DEPENDENCY") continue;
    if (edge.fromId === selectedId || edge.toId === selectedId) {
      related.add(edge.fromId);
      related.add(edge.toId);
    }
  }
  return related;
}

function ArchitectureClusterFrame({
  cluster,
  nodes,
  selectedId,
  related,
  incoming,
  outgoing,
  inspectorId,
  onSelect,
}: {
  cluster: SystemsArchitectCluster;
  nodes: SystemsArchitectNode[];
  selectedId: string | null;
  related: Set<string>;
  incoming: Set<string>;
  outgoing: Set<string>;
  inspectorId: string;
  onSelect: (id: string) => void;
}) {
  const awaiting = cluster.kind === "AWAITING_BUSINESS_MODEL";
  return (
    <div
      className={`systems-architect-cluster${awaiting ? " is-awaiting" : " is-known"}`}
      style={{
        left: `${cluster.x}%`,
        top: `${cluster.y}%`,
        width: `${cluster.width}%`,
        height: `${cluster.height}%`,
      }}
      data-cluster={cluster.id}
      data-cluster-kind={cluster.kind}
      data-required={cluster.containsRequired ? "true" : "false"}
    >
      <p className="systems-architect-cluster-label">{cluster.title}</p>
      {awaiting ? (
        <p className="systems-architect-cluster-wait">Awaiting business model</p>
      ) : (
        <ul className="systems-architect-cluster-systems">
          {nodes.map((node) => {
            const selected = selectedId === node.id;
            const dimmed = Boolean(selectedId) && !related.has(node.id);
            return (
              <li key={node.id}>
                <button
                  type="button"
                  className={`systems-architect-system ${statusClass(node.status)}${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}${incoming.has(node.id) ? " is-incoming" : ""}${outgoing.has(node.id) ? " is-outgoing" : ""}`}
                  aria-pressed={selected}
                  aria-controls={inspectorId}
                  aria-label={`${node.label}, ${node.statusLabel}${node.required ? ", required" : ""}`}
                  data-family={node.family ?? ""}
                  data-node-kind="system"
                  data-status={node.status}
                  data-incoming={incoming.has(node.id) ? "true" : "false"}
                  data-outgoing={outgoing.has(node.id) ? "true" : "false"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(node.id);
                  }}
                >
                  {node.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ArchitectureEdgeLayer({
  view,
  selectedId,
  related,
}: {
  view: SystemsArchitectHqView;
  selectedId: string | null;
  related: Set<string>;
}) {
  const byId = useMemo(() => new Map(view.nodes.map((node) => [node.id, node])), [view.nodes]);
  const markerId = useId().replace(/:/g, "");
  return (
    <svg className="systems-architect-edges" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
      <defs>
        <marker id={`${markerId}-dep`} markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
          <path d="M0 0 L5 2.5 L0 5 Z" fill="rgba(34, 211, 238, 0.85)" />
        </marker>
      </defs>
      {view.edges.map((edge) => {
        const from = byId.get(edge.fromId);
        const to = byId.get(edge.toId);
        if (!from || !to) return null;
        const active = Boolean(selectedId) && (edge.fromId === selectedId || edge.toId === selectedId) && edge.kind === "DEPENDENCY";
        const dimmed = Boolean(selectedId) && !active && !related.has(edge.fromId);
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className={`systems-architect-edge systems-architect-edge--${edge.kind.toLowerCase()}${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
            markerEnd={edge.kind === "DEPENDENCY" ? `url(#${markerId}-dep)` : undefined}
            data-edge-kind={edge.kind}
            data-from={edge.fromId}
            data-to={edge.toId}
          />
        );
      })}
    </svg>
  );
}

function SystemsArchitectureCanvas({
  view,
  selectedId,
  inspectorId,
  onSelect,
}: {
  view: SystemsArchitectHqView;
  selectedId: string | null;
  inspectorId: string;
  onSelect: (id: string) => void;
}) {
  const related = relatedNodeIds(selectedId, view.edges);
  const incoming = new Set(view.edges.filter((edge) => edge.kind === "DEPENDENCY" && edge.toId === selectedId).map((edge) => edge.fromId));
  const outgoing = new Set(view.edges.filter((edge) => edge.kind === "DEPENDENCY" && edge.fromId === selectedId).map((edge) => edge.toId));
  const nodesByCluster = new Map<string, SystemsArchitectNode[]>();
  for (const node of view.nodes) {
    if (!node.family) continue;
    const list = nodesByCluster.get(node.clusterId) ?? [];
    list.push(node);
    nodesByCluster.set(node.clusterId, list);
  }

  return (
    <div className="systems-architect-canvas" aria-label="Operating architecture canvas">
      {view.clusters.map((cluster) => (
        <ArchitectureClusterFrame
          key={cluster.id}
          cluster={cluster}
          nodes={nodesByCluster.get(cluster.id) ?? []}
          selectedId={selectedId}
          related={related}
          incoming={incoming}
          outgoing={outgoing}
          inspectorId={inspectorId}
          onSelect={onSelect}
        />
      ))}
      <ArchitectureEdgeLayer view={view} selectedId={selectedId} related={related} />
    </div>
  );
}

function ArchitectureMobileList({
  view,
  selectedId,
  inspectorId,
  onSelect,
}: {
  view: SystemsArchitectHqView;
  selectedId: string | null;
  inspectorId: string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(view.nodes.map((node) => [node.id, node]));
  return (
    <div className="systems-architect-mobile" aria-label="Operating architecture list">
      {view.clusters.map((cluster) => (
        <section key={cluster.id} className={`systems-architect-mobile-cluster${cluster.kind === "AWAITING_BUSINESS_MODEL" ? " is-awaiting" : ""}`}>
          <p className="systems-architect-cluster-label">{cluster.title}</p>
          {cluster.kind === "AWAITING_BUSINESS_MODEL" ? (
            <p className="systems-architect-cluster-wait">Awaiting business model</p>
          ) : null}
          <ul>
            {cluster.nodeIds.map((id) => {
              const node = byId.get(id);
              if (!node?.family) return null;
              const outgoing = node.dependents.map((item) => item.label).join(", ");
              const incoming = node.dependencies.map((item) => item.label).join(", ");
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    className={`systems-architect-mobile-node ${statusClass(node.status)}${selectedId === node.id ? " is-selected" : ""}`}
                    aria-pressed={selectedId === node.id}
                    aria-controls={inspectorId}
                    aria-label={`${node.label}, ${node.statusLabel}`}
                    data-family={node.family ?? node.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(node.id);
                    }}
                  >
                    <span className="systems-architect-dot-core" aria-hidden />
                    <span>
                      <span className="systems-architect-dot-name">{node.label}</span>
                      <span className="systems-architect-dot-state">{node.statusLabel}</span>
                      {incoming ? <span className="systems-architect-cue">depends on {incoming}</span> : null}
                      {outgoing ? <span className="systems-architect-cue">feeds {outgoing}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SystemInspector({
  node,
  view,
  inspectorId,
}: {
  node: SystemsArchitectNode | null;
  view: SystemsArchitectHqView;
  inspectorId: string;
}) {
  const entityName = view.entityName ?? view.ventureName;
  const inspectorRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    resetSystemsArchitectInspectorScroll(inspectorRef.current);
  }, [node?.id]);

  if (!node || !node.family) {
    return (
      <aside
        ref={inspectorRef}
        id={inspectorId}
        className="systems-architect-inspector"
        aria-label="System inspector"
        data-inspector-system=""
      >
        <p className="systems-architect-kicker">System inspector</p>
        <p className="systems-architect-muted">Select a system to inspect why it exists.</p>
      </aside>
    );
  }

  return (
    <aside
      ref={inspectorRef}
      id={inspectorId}
      key={node.id}
      className="systems-architect-inspector"
      aria-label={`Inspector for ${node.label}`}
      data-inspector-system={node.label}
    >
      <header className="systems-architect-inspector-head">
        <p className="systems-architect-kicker">System</p>
        <h3 className="systems-architect-inspector-title">{node.label}</h3>
        <dl className="systems-architect-inspector-lead">
          <div>
            <dt>Status</dt>
            <dd>{node.statusLabel}</dd>
          </div>
          <div>
            <dt>Venture / Opportunity</dt>
            <dd>{entityName ?? "Not bound"}</dd>
          </div>
        </dl>
      </header>
      <dl className="systems-architect-inspector-fields">
        <div>
          <dt>Purpose</dt>
          <dd>{node.purpose}</dd>
        </div>
        <div>
          <dt>Why required for this entity</dt>
          <dd>{node.whyNeeded}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {node.statusLabel}
            <span className="systems-architect-tech">{node.family}</span>
          </dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>
            {node.capabilities.length === 0 ? (
              "None modeled"
            ) : (
              <ul className="systems-architect-cap-list">
                {node.capabilities.map((capability) => (
                  <li key={capability.code}>
                    <span>{capability.label}</span>
                    <span className="systems-architect-tech">{capability.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>Dependencies</dt>
          <dd>
            {node.dependencies.length === 0 ? (
              "None declared"
            ) : (
              <ul className="systems-architect-cap-list">
                {node.dependencies.map((relation) => (
                  <li key={relation.id}>
                    <span>{relation.label}</span>
                    <span className="systems-architect-tech">dependency</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>Dependents</dt>
          <dd>
            {node.dependents.length === 0 ? (
              "None declared"
            ) : (
              <ul className="systems-architect-cap-list">
                {node.dependents.map((relation) => (
                  <li key={relation.id}>
                    <span>{relation.label}</span>
                    <span className="systems-architect-tech">dependent</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>Provider category</dt>
          <dd>{node.providerCategory ?? "None"}</dd>
        </div>
        <div>
          <dt>Selected provider</dt>
          <dd>{node.selectedProviderLabel}</dd>
        </div>
        <div>
          <dt>Candidates</dt>
          <dd>{node.providerCandidates.length === 0 ? "None modeled" : node.providerCandidates.join(", ")}</dd>
        </div>
        <div>
          <dt>Tenancy</dt>
          <dd>{node.tenancyLabel}</dd>
        </div>
        <div>
          <dt>Procurement</dt>
          <dd>{node.procurementLabel}</dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{node.costDisplay}</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>
            {node.writeAuthorityLabel}
            <span className="systems-architect-tech">{node.writeAuthorityDetail}</span>
          </dd>
        </div>
        <div>
          <dt>Unresolved gaps</dt>
          <dd>
            {node.unresolved.length === 0 ? (
              "None on this system"
            ) : (
              <ul className="systems-architect-cap-list">
                {node.unresolved.map((item) => (
                  <li key={item.code}>
                    <span>{item.question}</span>
                    <span className="systems-architect-tech">{item.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function NoArchitectureContext() {
  return (
    <section className="systems-architect-empty" data-systems-architect-context="none">
      <p className="systems-architect-empty-copy">
        Select a venture or opportunity to inspect its operating blueprint.
      </p>
    </section>
  );
}

function ArchitectureWorkspaceBar({
  view,
  onClose,
}: {
  view: SystemsArchitectHqView;
  onClose?: () => void;
}) {
  const entityName = view.hasArchitectureContext ? (view.entityName ?? view.ventureName) : "No venture selected";
  const candidate = view.entityKind === "OPPORTUNITY_CANDIDATE";
  return (
    <div className="systems-architect-workspace-bar">
      {onClose ? (
        <button
          type="button"
          className="systems-architect-back"
          data-systems-architect-back="true"
          aria-label="Back to HQ floor"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          ← Back to HQ
        </button>
      ) : null}
      <p className="systems-architect-kicker hq-systems-kicker">Systems Architect</p>
      <h2 className="systems-architect-title">
        {!view.hasArchitectureContext || view.entityKind === "NONE"
          ? "No venture selected"
          : `${candidate ? "Opportunity Blueprint" : "Operating Blueprint"} — ${entityName}`}
      </h2>
    </div>
  );
}

function ArchitectureIdentityHeader({ view }: { view: SystemsArchitectHqView }) {
  const entityId = view.entityId ?? view.ventureId;
  const candidate = view.entityKind === "OPPORTUNITY_CANDIDATE";
  return (
    <header className="systems-architect-identity">
      <dl className="systems-architect-identity-fields systems-architect-bar">
        <div>
          <dt>Context</dt>
          <dd>{candidate ? "Opportunity Candidate" : "Venture"}</dd>
        </div>
        <div>
          <dt>{candidate ? "Candidate ID" : "Venture ID"}</dt>
          <dd>{abbreviateCanonicalId(entityId) ?? "Unknown"}</dd>
        </div>
        {candidate ? (
          <div>
            <dt>Status</dt>
            <dd>{view.entityStatusLabel ?? "Not yet promoted to venture"}</dd>
          </div>
        ) : (
          <div>
            <dt>Origin</dt>
            <dd>{view.entityOrigin ?? view.ventureOrigin ?? "Unknown"}</dd>
          </div>
        )}
        <div>
          <dt>Business Model</dt>
          <dd>
            {view.businessModelLabel}
            {view.businessModel !== "AMBIGUOUS" ? <span className="systems-architect-tech">{view.businessModel}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Monetization</dt>
          <dd>
            {view.monetizationLabel}
            {view.monetizationModel ? <span className="systems-architect-tech">{view.monetizationModel}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Architecture Status</dt>
          <dd>{view.architectureDisplayLabel}</dd>
        </div>
      </dl>
    </header>
  );
}

function AmbiguousSplit({ view }: { view: SystemsArchitectHqView }) {
  if (!view.evidenceInsufficient) return null;
  return (
    <div className="systems-architect-known-split">
      <section>
        <p className="systems-architect-kicker">Known systems</p>
        <ul>
          {view.knownSystemLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </section>
      <section>
        <p className="systems-architect-kicker">Unresolved areas</p>
        <ul>
          {view.unresolvedAreaLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        {view.unresolvedReason ? <p className="systems-architect-unresolved">Reason: {view.unresolvedReason}</p> : null}
      </section>
    </div>
  );
}

export function SystemsArchitectBlueprint({ view, compact = false }: Props) {
  if (!compact) {
    return <SystemsArchitectDetail view={view} />;
  }

  if (!view.hasArchitectureContext || view.entityKind === "NONE") {
    return (
      <section
        className="systems-architect-blueprint systems-architect-blueprint--compact hq-systems-blueprint hq-systems-blueprint--compact"
        data-systems-architect-preview="true"
        data-systems-architect-interactive="false"
        aria-label="System topology preview. Open Systems Architect to inspect systems."
      >
        <p className="systems-architect-kicker hq-systems-kicker">Systems Architect</p>
        <p className="systems-architect-title">No venture selected</p>
        <NoArchitectureContext />
      </section>
    );
  }

  const entityName = view.entityName ?? view.ventureName;
  const candidate = view.entityKind === "OPPORTUNITY_CANDIDATE";

  return (
    <section
      className="systems-architect-blueprint systems-architect-blueprint--compact hq-systems-blueprint hq-systems-blueprint--compact"
      data-systems-architect-preview="true"
      data-systems-architect-interactive="false"
      aria-label="System topology preview. Open Systems Architect to inspect systems."
    >
      <p className="systems-architect-kicker hq-systems-kicker">Systems Architect</p>
      <p className="systems-architect-venture">
        {candidate ? "Opportunity Blueprint" : "Operating Blueprint"} — {entityName}
      </p>
      <dl className="systems-architect-floor-summary">
        <div>
          <dt>Context</dt>
          <dd>{candidate ? "Opportunity Candidate" : "Venture"}</dd>
        </div>
        <div>
          <dt>Business Model</dt>
          <dd>{view.businessModelLabel}</dd>
        </div>
        <div>
          <dt>Monetization</dt>
          <dd>{view.monetizationLabel}</dd>
        </div>
        <div>
          <dt>Architecture</dt>
          <dd>{view.architectureDisplayLabel}</dd>
        </div>
      </dl>
      <div className="systems-architect-topo">
        <ol className="systems-architect-spine">
          {view.topologySpine.map((point, index) => (
            <li key={point.id} className={`systems-architect-spine-item is-${point.indicator.toLowerCase()}`}>
              {index > 0 ? <span className="systems-architect-spine-link" aria-hidden /> : null}
              <span className="systems-architect-spine-stack">
                <span className="systems-architect-branches" aria-hidden>
                  {point.branchIndicators.map((indicator, branchIndex) => (
                    <span key={`${point.id}-${branchIndex}`} className={`systems-architect-branch ${statusClass(indicator)}`} />
                  ))}
                </span>
                <span className={`systems-architect-spine-node ${statusClass(point.indicator)}`} />
                <span className="systems-architect-spine-label">{point.title}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      {view.knownSystemLabels.length > 0 ? (
        <div className="systems-architect-floor-known" data-systems-architect-known-preview="true">
          <p className="systems-architect-kicker">Known</p>
          <p className="systems-architect-floor-known-list">{view.knownSystemLabels.join(" · ")}</p>
        </div>
      ) : null}
      {view.evidenceInsufficient && view.unresolvedAreaLabels.length > 0 ? (
        <div className="systems-architect-floor-unresolved" data-systems-architect-unresolved-preview="true">
          <p className="systems-architect-kicker">Unresolved</p>
          <p className="systems-architect-floor-unresolved-list">{view.unresolvedAreaLabels.join(" · ")}</p>
        </div>
      ) : null}
      <p className="systems-architect-topo-meta">
        Preview only — open this room to inspect systems. Required: {view.requiredCount} · Deferred: {view.deferredCount}
      </p>
    </section>
  );
}

export function SystemsArchitectDetail({ view, onClose }: DetailProps) {
  const inspectorId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(view.defaultSelectedNodeId);
  const selected = useMemo(() => selectSystemsArchitectNode(view, selectedId), [view, selectedId]);

  useEffect(() => {
    setSelectedId(view.defaultSelectedNodeId);
  }, [view.defaultSelectedNodeId, view.entityId]);

  if (!view.hasArchitectureContext || view.entityKind === "NONE") {
    return (
      <div
        className="systems-architect-detail hq-systems-detail"
        data-systems-architect-interactive="false"
        data-systems-architect-context="none"
      >
        <ArchitectureWorkspaceBar view={view} onClose={onClose} />
        <NoArchitectureContext />
      </div>
    );
  }

  return (
    <div
      className="systems-architect-detail hq-systems-detail"
      data-systems-architect-interactive="true"
      data-systems-architect-entity-kind={view.entityKind}
      data-systems-architect-entity-id={view.entityId ?? ""}
    >
      <ArchitectureWorkspaceBar view={view} onClose={onClose} />
      <section className="systems-architect-blueprint hq-systems-blueprint" aria-label="Operating architecture canvas">
        <ArchitectureIdentityHeader view={view} />
        <AmbiguousSplit view={view} />
        <div className="systems-architect-shell">
          <SystemsArchitectureCanvas view={view} selectedId={selected?.id ?? null} inspectorId={inspectorId} onSelect={setSelectedId} />
          <ArchitectureMobileList view={view} selectedId={selected?.id ?? null} inspectorId={inspectorId} onSelect={setSelectedId} />
          <SystemInspector node={selected} view={view} inspectorId={inspectorId} />
        </div>
      </section>
      <p className="systems-architect-truth hq-systems-truth">
        Modeled is not purchased. Deferred is not ready. Read-only verification is not write-ready. Live provisioning
        authority is not granted.
      </p>
    </div>
  );
}
