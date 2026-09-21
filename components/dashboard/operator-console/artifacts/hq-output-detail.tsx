"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HQDetailTab, HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { InspectorSection } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { LineageMarker } from "./lineage-accent";
import { useOptionalHqArtifactInspector } from "./hq-artifact-inspector-provider";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { CustomerSuggestionsTab } from "../customer-suggestions-tab";

const TAB_LABELS: Record<HQDetailTab, string> = {
  intelligence: "Intelligence",
  money: "Money",
  overview: "Overview",
  insights: "Insights",
  evidence: "Evidence",
  timeline: "Timeline",
  system: "System View",
  suggestions: "Customer Suggestions",
};

function TermHelp({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = `hq-term-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <span className={`hq-term-help${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="hq-term-help-trigger"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        {label}
        <span className="hq-term-help-icon" aria-hidden="true">
          ?
        </span>
      </button>
      <span id={tooltipId} role="tooltip" className="hq-term-tooltip">
        {text}
      </span>
    </span>
  );
}

function EvidenceBadge({ label, help }: { label: string; help?: string }) {
  if (help) return <TermHelp label={label} text={help} />;
  return <span className="hq-evidence-badge">{label}</span>;
}

function SectionBody({ section }: { section: InspectorSection }) {
  return (
    <div className="mt-2">
      {section.emptyMessage && section.rows.length === 0 && !section.bullets?.length ? (
        <p className="text-sm italic text-zinc-500">{section.emptyMessage}</p>
      ) : null}
      {section.rows.length > 0 ? (
        <div className="infinity-data-grid infinity-holographic-surface infinity-table-shell">
          <dl className="hq-founder-table space-y-0">
            {section.rows.map((row) => (
              <div
                key={row.id ?? `${section.id}:${row.label}`}
                className={`hq-founder-table-row grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[minmax(8rem,42%)_1fr] sm:gap-2${row.numeric ? " hq-founder-table-row--numeric" : ""}${row.emphasized ? " is-emphasized" : ""}`}
              >
                <dt className="text-zinc-500">{row.help ? <TermHelp label={row.label} text={row.help} /> : row.label}</dt>
                <dd
                  className={
                    row.tone === "pass"
                      ? "text-emerald-200"
                      : row.tone === "fail"
                        ? "text-red-300"
                        : row.tone === "warn"
                          ? "text-amber-200"
                          : `text-zinc-100${row.numeric ? " hq-founder-num" : ""}`
                  }
                >
                  {row.value}
                  {row.secondary ? <span className="hq-founder-table-secondary">{row.secondary}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {section.bullets?.length ? (
        <ul className="mt-2 space-y-1">
          {section.bullets.map((bullet, index) => (
            <li key={`${section.id}:bullet:${index}`} className="text-sm text-zinc-200 before:mr-2 before:text-zinc-500 before:content-['–']">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DetailSection({ section }: { section: InspectorSection }) {
  const founder = section.presentation === "primary";
  const toneClass =
    section.toneGroup === "actual"
      ? "hq-money-panel hq-money-panel--actual"
      : section.toneGroup === "estimated"
        ? "hq-money-panel hq-money-panel--estimated"
        : section.toneGroup === "scenario"
          ? "hq-money-panel hq-money-panel--scenario"
          : section.toneGroup === "summary"
            ? "hq-money-panel hq-money-panel--summary"
            : "";
  const className = `hq-inspector-section ${founder ? "hq-inspector-section--founder infinity-holographic-surface" : ""} ${toneClass}`.trim();
  const heading = (
    <div className="flex flex-wrap items-center gap-2">
      <p className="hq-inspector-section-label">{section.title}</p>
      {section.badge ? <span className="hq-money-badge">{section.badge}</span> : null}
    </div>
  );
  if (section.collapsible) {
    return (
      <details className={className}>
        <summary className="hq-inspector-section-label cursor-pointer">{section.collapseLabel ?? section.title}</summary>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{section.title}</p>
        <SectionBody section={section} />
      </details>
    );
  }
  return (
    <section className={className}>
      {heading}
      {section.lead ? <p className="hq-money-hero-conclusion">{section.lead}</p> : null}
      {section.layout === "metric-hero" ? (
        <HeroCardsBody section={section} />
      ) : section.layout === "cards" ? (
        <MoneyCardsBody section={section} />
      ) : section.layout === "waterfall" ? (
        <WaterfallBody section={section} />
      ) : section.layout === "comparison-table" ? (
        <ComparisonTableBody section={section} />
      ) : section.layout === "phase-list" ? (
        <PhaseListBody section={section} />
      ) : section.layout === "command-deck" ? (
        <CommandDeckBody section={section} />
      ) : (
        <SectionBody section={section} />
      )}
    </section>
  );
}

function HeroCardsBody({ section }: { section: InspectorSection }) {
  const conclusion = section.rows.filter((row) => row.kind === "conclusion");
  const hero = section.rows.filter((row) => row.kind !== "conclusion");
  return (
    <div className="mt-3">
      {conclusion.map((row) => (
        <p key={row.id ?? row.label} className="hq-money-hero-conclusion">
          {row.primaryValue ?? row.value}
        </p>
      ))}
      <div className="hq-money-hero-grid">
        {hero.map((row) => (
          <article
            key={row.id ?? `${section.id}:${row.label}`}
            className={`hq-money-hero-card${row.kind === "secondary" ? " hq-money-hero-card--secondary" : " hq-money-hero-card--emphasis"}`}
          >
            <p className="hq-money-hero-value hq-founder-num">{row.primaryValue ?? row.value}</p>
            <p className="hq-money-hero-label">
              {row.help ? <TermHelp label={row.label} text={row.help} /> : row.label}
            </p>
            <div className="hq-money-hero-meta">
              <span className="hq-money-split">
                <span className="hq-money-split-actual">Actual — {row.actualLabel ?? "Not measured"}</span>
                <span className="hq-money-split-estimate">{row.estimateKind === "modeled" ? "Modeled" : "Estimate"}</span>
              </span>
              {row.evidenceLabel ? (
                <span className={`hq-confidence-dot ${row.evidenceLabel.toLowerCase().includes("strong") ? "is-strong" : row.evidenceLabel.toLowerCase().includes("moderate") ? "is-moderate" : "is-weak"}`}>
                  <EvidenceBadge
                    label={row.evidenceLabel}
                    help="How much evidence supports this estimate."
                  />
                </span>
              ) : null}
            </div>
            {row.detail ? (
              <details className="hq-money-why">
                <summary>Why?</summary>
                <p>{row.detail}</p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function MoneyCardsBody({ section }: { section: InspectorSection }) {
  if (!section.rows.length) return <SectionBody section={section} />;
  return (
    <div className="mt-2">
      <div className="hq-money-card-grid">
        {section.rows.map((row) => (
          <article key={row.id ?? `${section.id}:${row.label}`} className="hq-money-card">
            {row.primaryValue ? <p className="hq-money-hero-value">{row.primaryValue}</p> : null}
            <p className="hq-money-card-label">
              {row.help ? <TermHelp label={row.label} text={row.help} /> : row.label}
            </p>
            {row.primaryValue ? null : <p className="hq-money-card-value">{row.value}</p>}
            {row.primaryValue && row.value !== row.primaryValue ? <p className="hq-money-card-range">{row.value}</p> : null}
            {row.evidenceLabel ? <span className="hq-evidence-badge">{row.evidenceLabel}</span> : null}
            {row.detail ? (
              <details className="hq-money-why">
                <summary>Why?</summary>
                <p>{row.detail}</p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
      {section.bullets?.length ? (
        <ul className="mt-2 space-y-1">
          {section.bullets.map((bullet, index) => (
            <li key={`${section.id}:bullet:${index}`} className="text-sm text-zinc-200 before:mr-2 before:text-zinc-500 before:content-['–']">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WaterfallBody({ section }: { section: InspectorSection }) {
  return (
    <ol className="hq-founder-waterfall infinity-holographic-surface">
      {section.rows.map((row) => (
        <li key={row.id ?? row.label} className="hq-founder-waterfall-step">
          <span className="hq-founder-waterfall-label">{row.help ? <TermHelp label={row.label} text={row.help} /> : row.label}</span>
          <span className="hq-founder-num hq-money-hero-value">{row.primaryValue ?? row.value}</span>
        </li>
      ))}
    </ol>
  );
}

function ComparisonTableBody({ section }: { section: InspectorSection }) {
  return (
    <div className="infinity-data-grid infinity-data-grid--compare infinity-holographic-surface infinity-table-shell hq-founder-table-scroll">
      <table className="hq-founder-table hq-founder-table--compare">
        <thead>
          <tr>
            <th scope="col">Customer problem</th>
            <th scope="col">What market options do</th>
            <th scope="col">Infinity opportunity</th>
            <th scope="col">Evidence strength</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr
              key={row.id ?? row.label}
              className={`hq-founder-table-row${row.emphasized ? " is-emphasized" : ""}`}
            >
              <th scope="row">{row.compareLeft ?? row.label}</th>
              <td>{row.label}</td>
              <td>{row.compareRight ?? row.value}</td>
              <td>{row.evidenceLabel ?? row.secondary ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhaseListBody({ section }: { section: InspectorSection }) {
  const summary = section.rows.filter((row) => row.kind !== "phase" && row.kind !== "path");
  const path = section.rows.filter((row) => row.kind === "path");
  const phases = section.rows.filter((row) => row.kind === "phase");
  const preview = phases.filter((row) => row.emphasized).length ? phases.filter((row) => row.emphasized) : phases.slice(0, 3);
  const rest = phases.filter((row) => !preview.includes(row));
  return (
    <div className="mt-3 infinity-holographic-surface infinity-build-plan">
      {path.length ? (
        <ol className="hq-founder-path">
          {path.map((row) => (
            <li key={row.id ?? row.label} className={`hq-founder-path-step${row.value === "Current" ? " is-current" : ""}${row.value === "Complete" ? " is-complete" : ""}`}>
              {row.label}
            </li>
          ))}
        </ol>
      ) : null}
      {summary.length ? <SectionBody section={{ ...section, rows: summary, layout: "stack" }} /> : null}
      <p className="hq-command-kicker">Next 3 phases</p>
      <div className="hq-build-phase-grid">
        {preview.map((row) => (
          <article key={row.id ?? row.label} className="hq-build-phase-card is-emphasized">
            <p className="hq-money-card-label">{row.label}</p>
            <p className="hq-money-card-value">{row.value}</p>
            {row.readiness ? <span className="hq-evidence-badge">{row.readiness}</span> : null}
            {row.secondary ? <p className="hq-founder-table-secondary">{row.secondary}</p> : null}
            {row.detail ? (
              <details className="hq-money-why">
                <summary>Why?</summary>
                <p>{row.detail}</p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
      {rest.length ? (
        <details className="hq-build-full-path">
          <summary>View full build path</summary>
          <div className="hq-build-phase-grid">
            {rest.map((row) => (
              <article key={row.id ?? row.label} className="hq-build-phase-card">
                <p className="hq-money-card-label">{row.label}</p>
                <p className="hq-money-card-value">{row.value}</p>
                {row.readiness ? <span className="hq-evidence-badge">{row.readiness}</span> : null}
                {row.secondary ? <p className="hq-founder-table-secondary">{row.secondary}</p> : null}
                {row.detail ? (
                  <details className="hq-money-why">
                    <summary>Why?</summary>
                    <p>{row.detail}</p>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function rowById(section: InspectorSection, id: string) {
  return section.rows.find((row) => row.id === id);
}

function CommandDeckBody({ section }: { section: InspectorSection }) {
  const value = (id: string) => rowById(section, id)?.value ?? "—";
  const help = (id: string) => rowById(section, id)?.help;
  const scoreboard = section.rows.filter((row) => row.numeric);
  const systems = section.rows.filter((row) => row.kind === "system");
  const edges = section.rows.filter((row) => row.kind === "compare");
  const nextPhases = section.rows.filter((row) => row.kind === "phase");
  const confidence = value("deck-confidence");
  return (
    <div className="hq-command-deck infinity-holographic-surface infinity-command-deck">
      <div className="hq-command-deck-grid">
        <div className="hq-command-deck-identity">
          <p className="hq-command-kicker">Venture</p>
          <h3 className="hq-command-name">{value("deck-name")}</h3>
          <p className="hq-command-concept">{value("deck-concept")}</p>
          <dl className="hq-command-identity-list">
            <div><dt>Customer</dt><dd>{value("deck-customer")}</dd></div>
            <div><dt>Core problem</dt><dd>{value("deck-problem")}</dd></div>
            <div><dt>Solution</dt><dd>{value("deck-solution")}</dd></div>
            <div><dt>Business model</dt><dd>{value("deck-model")}</dd></div>
          </dl>
          <p className="hq-command-kicker">Infinity's venture thesis</p>
          <p className="hq-command-thesis">{value("deck-thesis")}</p>
        </div>
        <div className="hq-command-deck-scoreboard">
          <p className="hq-command-kicker">Economics</p>
          <div className="hq-command-metrics">
            {scoreboard.map((row) => (
              <article key={row.id ?? row.label} className={`hq-command-metric${row.kind === "hero" ? " is-hero" : ""}`}>
                <p className="hq-founder-num hq-money-hero-value">{row.primaryValue ?? row.value}</p>
                <p className="hq-money-hero-label">{row.help ? <TermHelp label={row.label} text={row.help} /> : row.label}</p>
                {row.evidenceLabel ? (
                  <span className={`hq-confidence-dot ${row.evidenceLabel.toLowerCase().includes("strong") ? "is-strong" : row.evidenceLabel.toLowerCase().includes("moderate") ? "is-moderate" : "is-weak"}`}>
                    <EvidenceBadge label={row.evidenceLabel} help={row.help} />
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        <div className="hq-command-deck-systems">
          <p className="hq-command-kicker">Systems This Venture Needs</p>
          <p className="hq-command-coverage">{value("deck-coverage")}</p>
          <ol className="hq-command-system-strip">
            {systems.map((row) => (
              <li key={row.id ?? row.label} className={`hq-command-system-light is-${(row.readiness ?? row.value).toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="hq-command-system-mark" aria-hidden="true" />
                <span>{row.label}</span>
                <span className="hq-founder-table-secondary">{row.readiness ?? row.value}</span>
              </li>
            ))}
          </ol>
          <p className="hq-command-kicker">Build complexity</p>
          <p>{value("deck-complexity")}</p>
          <p className="hq-command-kicker">What Infinity Already Has</p>
          <p>{value("deck-already")}</p>
          <p className="hq-command-kicker">What This Venture Still Needs</p>
          <p>{value("deck-new")}</p>
          <p className="hq-founder-table-secondary">{value("deck-os-note")}</p>
        </div>
      </div>
      <div className="hq-command-deck-strip">
        <div>
          <p className="hq-command-kicker">Business case</p>
          <p>{value("deck-business-case")}</p>
        </div>
        <div>
          <p className="hq-command-kicker">Build readiness</p>
          <p>{value("deck-build-readiness")}</p>
          <p className="hq-founder-table-secondary">{value("deck-build-reason")}</p>
        </div>
        <div>
          <p className="hq-command-kicker">Economic confidence</p>
          <p>
            {help("deck-confidence") ? <TermHelp label={confidence} text={help("deck-confidence")!} /> : confidence}
          </p>
        </div>
        <div>
          <p className="hq-command-kicker">Current Position</p>
          <p>{value("deck-position")}</p>
        </div>
        <div>
          <p className="hq-command-kicker">Biggest advantage</p>
          <p>{value("deck-advantage")}</p>
        </div>
        <div>
          <p className="hq-command-kicker">Biggest risk</p>
          <p>{value("deck-risk")}</p>
        </div>
      </div>
      <div className="hq-command-deck-next">
        <p className="hq-command-kicker">What Infinity Recommends Next</p>
        <p className="hq-command-next">{value("deck-next")}</p>
        <p className="hq-founder-table-secondary">Why: {value("deck-next-why")}</p>
        <p className="hq-founder-table-secondary">Test: {value("deck-next-test")}</p>
        <p className="hq-founder-table-secondary">Success: {value("deck-next-success")}</p>
      </div>
      {edges.length ? (
        <div className="hq-command-edge">
          <p className="hq-command-kicker">Market Advantage</p>
          <ComparisonTableBody section={{ ...section, rows: edges, layout: "comparison-table" }} />
        </div>
      ) : (
        <div className="hq-command-edge">
          <p className="hq-command-kicker">Market Advantage</p>
          <p className="hq-founder-table-secondary">Not enough complaint evidence yet.</p>
        </div>
      )}
      {nextPhases.length ? (
        <div>
          <p className="hq-command-kicker">Next 3 phases</p>
          <div className="hq-build-phase-grid">
            {nextPhases.map((row) => (
              <article key={row.id ?? row.label} className="hq-build-phase-card is-emphasized">
                <p className="hq-money-card-label">{row.label}</p>
                <p className="hq-money-card-value">{row.value}</p>
                {row.readiness ? <span className="hq-evidence-badge">{row.readiness}</span> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {rowById(section, "deck-scale-100") ? (
        <p className="hq-founder-table-secondary">{rowById(section, "deck-scale-100")?.label}: {value("deck-scale-100")}</p>
      ) : null}
    </div>
  );
}

function KeyMetricsSection({ metrics }: { metrics: HQEntityDetail["insights"]["metrics"] }) {
  if (!metrics.length) return null;
  return (
    <section className="hq-inspector-section">
      <p className="hq-inspector-section-label">Key metrics</p>
      <dl className="mt-2 space-y-1.5">
        {metrics.map((metric) => (
          <div key={metric.id || `${metric.kind ?? "metric"}:${metric.label}`} className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[minmax(8rem,42%)_1fr] sm:gap-2">
            <dt className="text-zinc-500">{metric.label}</dt>
            <dd className="text-zinc-100">{metric.value}</dd>
          </div>
        ))}
      </dl>
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
  embedded?: boolean;
};

export function HQOutputDetail({ detail, artifact, loading, error, embedded = false }: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const [activeTab, setActiveTab] = useState<HQDetailTab>(detail.availableTabs[0] ?? "overview");
  const safeTab = detail.availableTabs.includes(activeTab) ? activeTab : detail.availableTabs[0] ?? "overview";

  useEffect(() => {
    setActiveTab(detail.availableTabs[0] ?? "overview");
  }, [detail.entityId]);

  const tabContent = useMemo(() => {
    switch (safeTab) {
      case "intelligence": {
        const sections = detail.intelligence?.sections ?? [];
        const primary = sections.filter((section) => section.presentation === "primary");
        const advanced = sections.filter((section) => section.presentation !== "primary");
        const hasAdvanced = advanced.length > 0 || detail.insights.metrics.length > 0 || Boolean(detail.decisionWhy);
        if (!primary.length && !hasAdvanced) {
          return <p className="text-sm text-zinc-500">No persisted venture intelligence for this entity.</p>;
        }
        return (
          <div className="space-y-4">
            {primary.map((section) => (
              <div key={section.id}>
                <DetailSection section={section} />
                {section.id === "intelligence-money-summary" && detail.availableTabs.includes("money") ? (
                  <button
                    type="button"
                    className="hq-money-view-link mt-3"
                    onClick={() => setActiveTab("money")}
                  >
                    View Money
                  </button>
                ) : null}
              </div>
            ))}
            {hasAdvanced ? (
              <details className="hq-inspector-advanced">
                <summary className="hq-inspector-advanced-summary">Advanced Analysis / System View</summary>
                <div className="mt-3 space-y-4">
                  <KeyMetricsSection metrics={detail.insights.metrics} />
                  {detail.decisionWhy ? (
                    <section className="hq-inspector-section">
                      <p className="hq-inspector-section-label">Decision rationale</p>
                      <p className="mt-2 text-sm text-zinc-300">{detail.decisionWhy}</p>
                    </section>
                  ) : null}
                  {advanced.map((section) => (
                    <DetailSection key={section.id} section={section} />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        );
      }
      case "money": {
        const sections = detail.money?.sections ?? [];
        if (!sections.length) {
          return <p className="text-sm text-zinc-500">No persisted money intelligence for this idea.</p>;
        }
        return (
          <div className="hq-money-tab infinity-holographic-surface space-y-4">
            {sections.map((section) => (
              <DetailSection key={section.id} section={section} />
            ))}
          </div>
        );
      }
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
              <KeyMetricsSection metrics={detail.insights.metrics} />
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
      case "suggestions":
        return <CustomerSuggestionsTab ventureId={detail.entityId} />;
      default:
        return null;
    }
  }, [detail, safeTab]);

  return (
    <div className={embedded ? "hq-output-detail hq-output-detail--embedded flex flex-col" : "flex h-full min-h-0 flex-col"}>
      <header className="hq-inspector-header hq-output-detail-header shrink-0 px-4 py-3 md:px-5">
        <div className="hq-inspector-header-glow" aria-hidden />
        <span className="hq-inspector-header-orb" aria-hidden />
        <div className="relative flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            {inspector?.inventory && !embedded ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  inspector.backToInventory();
                }}
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90 hover:text-cyan-100"
              >
                Back to room inventory
              </button>
            ) : null}
            {embedded ? (
              <p className="hq-command-kicker" data-hq-intelligence-kicker="true">
                Venture Intelligence
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <LineageMarker artifact={artifact} />
              {embedded ? null : (
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  {artifact.artifactType.replace(/_/g, " ")}
                </span>
              )}
              <span className="hq-inspector-state-badge">{detail.status}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-zinc-50 md:text-xl">{detail.title}</h2>
            {detail.subtitle ? <p className="mt-1 text-sm text-zinc-400">{detail.subtitle}</p> : null}
          </div>
          {detail.decision ? (
            <span className="hq-decision-token hq-decision-token--validate hq-decision-token--large shrink-0">{detail.decision}</span>
          ) : null}
        </div>
        <div className="hq-output-detail-tabs mt-3 flex flex-wrap gap-x-1 gap-y-1 border-b border-cyan-500/10" role="tablist" aria-label="Detail sections" data-hq-intelligence-tabs="true">
          {detail.availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={safeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`hq-output-detail-tab ${safeTab === tab ? "hq-output-detail-tab--active" : ""}`}
              data-hq-detail-tab={tab}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </header>

      <div
        className={
          embedded
            ? "hq-inspector-body hq-output-detail-body overflow-visible px-4 py-4 md:px-5"
            : "hq-inspector-body hq-output-detail-body min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5"
        }
        role="tabpanel"
      >
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
  variant = "inspector",
  ariaLabel = "Entity intelligence projection",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "inspector" | "workspace";
  ariaLabel?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const ignoreCloseUntilRef = useRef(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      ignoreCloseUntilRef.current = Date.now() + 300;
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
    if (Date.now() < ignoreCloseUntilRef.current) return;
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
        aria-label={ariaLabel}
        className={`hq-inspector-hologram hq-hologram-modal ${variant === "workspace" ? "hq-inspection-workspace-modal" : ""} ${closing ? "hq-inspector-hologram--closing" : ""}`}
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
          aria-label={variant === "workspace" ? "Close inspection" : "Close intelligence projection"}
        >
          <span aria-hidden>×</span>
        </button>
        <div className="relative flex h-full min-h-0 flex-col">{children}</div>
      </div>
    </>
  );
}
