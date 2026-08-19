"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HQDetailTab, HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { InspectorSection } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { LineageMarker } from "./lineage-accent";
import { useOptionalHqArtifactInspector } from "./hq-artifact-inspector-provider";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

const TAB_LABELS: Record<HQDetailTab, string> = {
  overview: "Overview",
  insights: "Insights",
  evidence: "Evidence",
  timeline: "Timeline",
  system: "System View",
};

function DetailSection({ section }: { section: InspectorSection }) {
  return (
    <section className="hq-inspector-section">
      <p className="hq-inspector-section-label">{section.title}</p>
      <div className="mt-2">
        {section.emptyMessage && section.rows.length === 0 && !section.bullets?.length ? (
          <p className="text-sm italic text-zinc-500">{section.emptyMessage}</p>
        ) : null}
        {section.rows.length > 0 ? (
          <dl className="space-y-1.5">
            {section.rows.map((row) => (
              <div key={`${section.id}-${row.label}`} className="grid grid-cols-[minmax(8rem,42%)_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">{row.label}</dt>
                <dd
                  className={
                    row.tone === "pass"
                      ? "text-emerald-200"
                      : row.tone === "fail"
                        ? "text-red-300"
                        : row.tone === "warn"
                          ? "text-amber-200"
                          : "text-zinc-100"
                  }
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {section.bullets?.length ? (
          <ul className="mt-2 space-y-1">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="text-sm text-zinc-200 before:mr-2 before:text-zinc-500 before:content-['–']">
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function RelatedWorkList() {
  const inspector = useOptionalHqArtifactInspector();
  if (!inspector?.entityDetail?.relatedWork.length) return null;
  return (
    <section className="hq-inspector-section">
      <p className="hq-inspector-section-label">Related work</p>
      <ul className="mt-2 space-y-1.5">
        {inspector.entityDetail.relatedWork.map((item) => (
          <li key={item.artifactId}>
            <button type="button" onClick={() => inspector.switchArtifact(item.artifactId)} className="hq-inspector-related-card text-sm">
              <span className="text-zinc-500">{item.roomLabel}</span>
              <span className="mx-1.5 text-zinc-600">·</span>
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  detail: HQEntityDetail;
  artifact: HqWorkArtifact;
  loading?: boolean;
  error?: string | null;
};

export function HQOutputDetail({ detail, artifact, loading, error }: Props) {
  const [activeTab, setActiveTab] = useState<HQDetailTab>(detail.availableTabs[0] ?? "overview");
  const safeTab = detail.availableTabs.includes(activeTab) ? activeTab : detail.availableTabs[0] ?? "overview";

  const tabContent = useMemo(() => {
    switch (safeTab) {
      case "overview":
        return (
          <div className="space-y-4">
            <section className="hq-inspector-section">
              <p className="hq-inspector-section-label">Summary</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-100">{detail.summary}</p>
            </section>
            {detail.decisionWhy ? (
              <section className="hq-inspector-section">
                <p className="hq-inspector-section-label">Decision rationale</p>
                <p className="mt-2 text-sm text-zinc-300">{detail.decisionWhy}</p>
              </section>
            ) : null}
            {detail.overview.sections.map((section) => (
              <DetailSection key={section.id} section={section} />
            ))}
            <RelatedWorkList />
          </div>
        );
      case "insights":
        return (
          <div className="space-y-4">
            {detail.insights.hotTakes.length > 0 ? (
              <section className="hq-inspector-section hq-inspector-hot-takes">
                <p className="hq-inspector-section-label">Infinity&apos;s hot takes</p>
                <ul className="mt-2 space-y-1.5">
                  {detail.insights.hotTakes.map((take) => (
                    <li key={take} className="text-sm text-zinc-100 before:mr-2 before:text-violet-300 before:content-['◆']">
                      {take}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {detail.insights.metrics.length > 0 ? (
              <section className="hq-inspector-section">
                <p className="hq-inspector-section-label">Key metrics</p>
                <dl className="mt-2 space-y-1.5">
                  {detail.insights.metrics.map((metric) => (
                    <div key={metric.label} className="grid grid-cols-[minmax(8rem,42%)_1fr] gap-2 text-sm">
                      <dt className="text-zinc-500">{metric.label}</dt>
                      <dd className="text-zinc-100">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        );
      case "evidence":
        return (
          <div className="space-y-4">
            {detail.evidence.sections.length > 0 ? (
              detail.evidence.sections.map((section) => <DetailSection key={section.id} section={section} />)
            ) : (
              <p className="text-sm text-zinc-500">No persisted evidence sections for this entity.</p>
            )}
          </div>
        );
      case "timeline":
        return (
          <section className="hq-inspector-section">
            <p className="hq-inspector-section-label">Venture journey</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detail.timeline.phases.map(({ phase, complete, current }) => (
                <span
                  key={phase}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    current
                      ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                      : complete
                        ? "bg-violet-500/15 text-violet-100"
                        : "bg-zinc-800/60 text-zinc-500"
                  }`}
                >
                  {phase}
                </span>
              ))}
            </div>
          </section>
        );
      case "system":
        return (
          <section className="hq-inspector-section hq-inspector-system">
            <p className="hq-inspector-section-label">System view</p>
            <dl className="mt-2 space-y-1.5">
              {detail.system.rows.map((row) => (
                <div key={`${row.label}-${row.value}`} className="hq-inspector-system-row grid grid-cols-[minmax(8rem,42%)_1fr] gap-2 text-sm">
                  <dt className="text-zinc-500">{row.label}</dt>
                  <dd className="break-all font-mono text-xs text-zinc-300">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      default:
        return null;
    }
  }, [detail, safeTab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="hq-inspector-header hq-output-detail-header shrink-0 px-4 py-3 md:px-5">
        <div className="hq-inspector-header-glow" aria-hidden />
        <span className="hq-inspector-header-orb" aria-hidden />
        <div className="relative flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LineageMarker artifact={artifact} />
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {artifact.artifactType.replace(/_/g, " ")}
              </span>
              <span className="hq-inspector-state-badge">{detail.status}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-zinc-50 md:text-xl">{detail.title}</h2>
            {detail.subtitle ? <p className="mt-1 text-sm text-zinc-400">{detail.subtitle}</p> : null}
          </div>
          {detail.decision ? (
            <span className="hq-decision-token hq-decision-token--validate hq-decision-token--large shrink-0">{detail.decision}</span>
          ) : null}
        </div>
        <div className="hq-output-detail-tabs mt-3 flex flex-wrap gap-x-1 gap-y-1 border-b border-cyan-500/10" role="tablist" aria-label="Detail sections">
          {detail.availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={safeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`hq-output-detail-tab ${safeTab === tab ? "hq-output-detail-tab--active" : ""}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </header>

      <div className="hq-inspector-body hq-output-detail-body min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5" role="tabpanel">
        {error ? <p className="mb-3 text-sm text-amber-300">{error}</p> : null}
        {loading ? <p className="mb-3 text-xs text-zinc-500">Refreshing persisted detail…</p> : null}
        {tabContent}
      </div>
    </div>
  );
}

export function HQOutputDetailShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const restoreFocus = useCallback(() => {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger && document.body.contains(trigger)) {
      trigger.focus();
    }
  }, []);

  const finishUnmount = useCallback(() => {
    setMounted(false);
    setClosing(false);
    restoreFocus();
  }, [restoreFocus]);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    onClose();
  }, [closing, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, requestClose]);

  useEffect(() => {
    if (open || !mounted) return;
    setClosing(true);
    const timeout = window.setTimeout(finishUnmount, 180);
    return () => window.clearTimeout(timeout);
  }, [finishUnmount, mounted, open]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`hq-inspector-backdrop hq-hologram-backdrop ${closing ? "hq-inspector-backdrop--closing" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Entity intelligence projection"
        className={`hq-inspector-hologram hq-hologram-modal ${closing ? "hq-inspector-hologram--closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="hq-inspector-energy-line" aria-hidden />
        <span className="hq-inspector-corner hq-inspector-corner--tl" aria-hidden />
        <span className="hq-inspector-corner hq-inspector-corner--tr" aria-hidden />
        <span className="hq-inspector-corner hq-inspector-corner--bl" aria-hidden />
        <span className="hq-inspector-corner hq-inspector-corner--br" aria-hidden />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            requestClose();
          }}
          className="hq-inspector-close absolute right-3 top-3 z-10"
          aria-label="Close intelligence projection"
        >
          <span aria-hidden>×</span>
        </button>
        <div className="relative flex h-full min-h-0 flex-col">{children}</div>
      </div>
    </>
  );
}
