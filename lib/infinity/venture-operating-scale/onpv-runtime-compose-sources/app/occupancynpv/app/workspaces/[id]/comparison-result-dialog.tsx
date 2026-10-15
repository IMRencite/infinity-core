"use client";

import { useEffect, useRef } from "react";
import {
  formatUsd,
  interpretComparisonResult,
  type ComparisonResultView,
} from "./comparison-result-presentation";
import { ComparisonSummaryCard } from "./comparison-summary-card";
import { OccupancynpvImprovementChrome } from "../../occupancynpv-improvement-chrome";
import { SensitivityTable } from "./sensitivity-table";

export function ComparisonResultDialog({
  open,
  result,
  onClose,
  onCompareAnother,
  onEditInputs,
}: {
  open: boolean;
  result: ComparisonResultView | null;
  onClose: () => void;
  onCompareAnother: () => void;
  onEditInputs: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((el) => !el.hasAttribute("disabled"));
    const first = focusable()[0];
    first?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !result) return null;
  const interpretation = interpretComparisonResult(result);
  const [leaseA, leaseB] = result.scenarios;
  const maxNpv = Math.max(...result.scenarios.map((row) => row.npv), 1);

  return (
    <div className="onpv-dialog-root" data-product-result="true">
      <div className="onpv-dialog-backdrop" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="onpv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onpv-result-title"
      >
        <header className="onpv-dialog-header">
          <div>
            <p className="onpv-kicker">OccupancyNPV</p>
            <h2 id="onpv-result-title">Lease Comparison Results</h2>
          </div>
          <button className="onpv-btn-tertiary" type="button" onClick={onClose} aria-label="Close results">Close</button>
        </header>

        <div className="onpv-dialog-body">
          <section className="onpv-card onpv-result-outcome" data-result-outcome="true">
            <p className="onpv-muted">Lower NPV at current assumptions</p>
            <p className="onpv-result-headline">{interpretation.outcomeLabel}</p>
            {!interpretation.equal ? <p className="onpv-result-difference">NPV difference: {formatUsd(interpretation.differenceAbs)}</p> : null}
            <p>{interpretation.differenceSummary}</p>
            <p className="onpv-muted">{interpretation.explanation}</p>
          </section>

          {leaseA && leaseB ? (
            <div className="onpv-npv-bars" aria-hidden="true">
              {result.scenarios.map((row) => (
                <div key={row.scenario_id} className="onpv-npv-bar-row">
                  <span>{row.scenario_name}</span>
                  <div className="onpv-npv-bar-track">
                    <div className="onpv-npv-bar" style={{ width: `${Math.max(8, (row.npv / maxNpv) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="onpv-result-cards">
            {leaseA ? <ComparisonSummaryCard leaseLabel="Lease A" scenario={leaseA} highlighted={!interpretation.equal && interpretation.lowerName === leaseA.scenario_name} /> : null}
            {leaseB ? <ComparisonSummaryCard leaseLabel="Lease B" scenario={leaseB} highlighted={!interpretation.equal && interpretation.lowerName === leaseB.scenario_name} /> : null}
          </div>

          <SensitivityTable leaseName={leaseA?.scenario_name ?? "Lease A"} rows={result.sensitivity} />
        </div>

        <footer className="onpv-dialog-footer">
          <div className="onpv-dialog-actions">
            <button className="onpv-btn-primary" type="button" data-primary-action="compare-another" onClick={onCompareAnother}>Compare Another</button>
            <button className="onpv-btn-secondary" type="button" onClick={onEditInputs}>Edit Inputs</button>
            <a className="onpv-btn-secondary" href="/occupancynpv/app">Back to Dashboard</a>
          </div>
          <p className="onpv-muted">
            <a className="onpv-link" href="mailto:infinitemediaresources@gmail.com">Help and support</a>
            {" · "}
            <OccupancynpvImprovementChrome contextual label="Have an idea to make this better?" workflow="lease comparison results" route="/occupancynpv/app/workspaces/comparison-results" />
          </p>
        </footer>
      </div>
    </div>
  );
}
