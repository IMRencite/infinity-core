import type { ReactNode } from "react";
import { OccupancynpvImprovementChrome } from "./occupancynpv-improvement-chrome";

export const metadata = {
  title: { default: "OccupancyNPV", template: "%s · OccupancyNPV" },
  description:
    "OccupancyNPV compares commercial lease cash flows and NPV so brokers and occupiers can choose the lower-cost deal.",
  icons: {
    icon: [
      { url: "/icon?v=onpv2", type: "image/png", sizes: "32x32" },
    ],
  },
};

const ONPV_CUSTOMER_SHELL_CSS = `
body:has(.onpv-customer-shell) > nav.pv-nav { display: none !important; }
.onpv-customer-shell {
  --onpv-gutter: 1.25rem;
  --onpv-accent: #1d4e78;
  --onpv-accent-contrast: #ffffff;
  --onpv-border: #d4d4d8;
  min-height: 100vh;
  background: #f4f6f8;
  color: #18181b;
  box-sizing: border-box;
  padding-inline: var(--onpv-gutter);
}
@media (min-width: 768px) {
  .onpv-customer-shell { --onpv-gutter: 1.5rem; }
}
@media (min-width: 1024px) {
  .onpv-customer-shell { --onpv-gutter: 2rem; }
}
.onpv-appbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  max-width: 56rem;
  margin: 0 auto;
  padding: 1rem 0 0.25rem;
}
.onpv-appbar-brand, .onpv-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: inherit;
  text-decoration: none;
}
.onpv-brand-mark {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 1.75rem;
}
.onpv-brand-mark svg { display: block; width: 100%; height: 100%; }
.onpv-brand-wordmark { white-space: nowrap; line-height: 1; }
.onpv-appbar nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  font-size: 0.875rem;
}
.onpv-appbar a { color: inherit; }
.onpv-appbar-site { color: #52525b; }
.onpv-page { margin-inline: auto; width: 100%; box-sizing: border-box; }
.onpv-page--auth { max-width: 28rem; padding-block: 2.5rem; }
.onpv-page--dash { max-width: 56rem; padding-block: 1.25rem 2.5rem; }
.onpv-page--workspace { max-width: 64rem; padding-block: 2rem; }
.onpv-page--checkout { max-width: 32rem; padding-block: 2.5rem; }
.onpv-dash { display: grid; gap: 1rem; }
.onpv-dash-header h1,
.onpv-customer-shell h1 { font-size: 1.65rem; font-weight: 650; margin: 0; letter-spacing: -0.02em; }
.onpv-customer-shell h2 { font-size: 1rem; font-weight: 650; margin: 0; }
.onpv-customer-shell h3 { font-size: 1rem; font-weight: 600; margin: 0; }
.onpv-customer-shell p { margin: 0.4rem 0 0; }
.onpv-kicker { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--onpv-accent); }
.onpv-lede { max-width: 40rem; color: #3f3f46; }
.onpv-card {
  background: #fff;
  border: 1px solid var(--onpv-border);
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
}
.onpv-access, .onpv-primary-panel {
  display: grid;
  gap: 1rem;
}
@media (min-width: 768px) {
  .onpv-access, .onpv-primary-panel { grid-template-columns: 1fr 1.4fr; align-items: start; }
}
.onpv-access-list { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
.onpv-access-list li { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; }
.onpv-access-list span { color: #52525b; font-size: 0.875rem; }
.onpv-access-actions, .onpv-create .onpv-row { display: grid; gap: 0.5rem; margin-top: 0.6rem; }
@media (min-width: 640px) {
  .onpv-access-actions { grid-template-columns: 1fr 1fr; }
  .onpv-create .onpv-row { grid-template-columns: 1fr auto; align-items: end; }
}
.onpv-section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
.onpv-workspace-grid { list-style: none; margin: 0.75rem 0 0; padding: 0; display: grid; gap: 0.75rem; }
.onpv-workspace-card { display: grid; gap: 0.75rem; margin: 0; }
.onpv-collection-toolbar { display: grid; gap: 0.75rem; margin-top: 0.75rem; }
.onpv-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.onpv-tab { appearance: none; border: 1px solid var(--onpv-border); background: #fff; border-radius: 999px; min-height: 2.25rem; padding: 0.4rem 0.85rem; font: inherit; cursor: pointer; }
.onpv-tab--active { background: var(--onpv-accent); color: var(--onpv-accent-contrast); border-color: transparent; }
.onpv-card-actions, .onpv-inline-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.onpv-menu { position: relative; }
.onpv-menu-panel { position: absolute; right: 0; top: calc(100% + 0.25rem); z-index: 3; min-width: 10rem; display: grid; background: #fff; border: 1px solid var(--onpv-border); border-radius: 0.5rem; box-shadow: 0 8px 24px rgba(24,24,27,0.08); }
.onpv-menu-panel button { appearance: none; background: none; border: 0; text-align: left; padding: 0.65rem 0.8rem; font: inherit; cursor: pointer; }
.onpv-pagination { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; align-items: center; margin-top: 1rem; }
.onpv-scenario-grid { list-style: none; margin: 0.75rem 0; padding: 0; display: grid; gap: 0.6rem; }
.onpv-scenario-item { display: grid; gap: 0.6rem; padding: 0.75rem; border: 1px solid var(--onpv-border); border-radius: 0.6rem; background: #fff; }
.onpv-scenario-item--active {
  border: 2px solid var(--onpv-accent);
  background: #e8eef4;
  box-shadow: inset 3px 0 0 var(--onpv-accent);
}
.onpv-scenario-item-head { display: flex; flex-wrap: wrap; gap: 0.35rem 0.55rem; align-items: center; }
.onpv-badge { display: inline-flex; align-items: center; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 999px; padding: 0.12rem 0.45rem; line-height: 1.2; white-space: nowrap; }
.onpv-badge--editing { color: var(--onpv-accent); border: 1px solid var(--onpv-accent); background: #fff; }
.onpv-workspace-header { margin: 0.75rem 0 1.25rem; }
@media (min-width: 640px) {
  .onpv-workspace-card, .onpv-scenario-item { grid-template-columns: 1fr auto; align-items: center; }
  .onpv-collection-toolbar { grid-template-columns: auto 1fr; align-items: center; }
}
.onpv-empty ol, .onpv-capabilities ul { margin: 0.6rem 0 0; padding-left: 1.15rem; display: grid; gap: 0.3rem; }
.onpv-customer-shell form { margin-top: 0; }
.onpv-customer-shell input, .onpv-customer-shell select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--onpv-border);
  border-radius: 0.5rem;
  padding: 0.7rem 0.8rem;
  margin-top: 0.25rem;
  min-height: 2.75rem;
}
.onpv-btn-primary,
a.onpv-btn-primary,
.onpv-customer-shell button.onpv-btn-primary,
.onpv-customer-shell button[type="submit"].onpv-btn-primary,
.onpv-btn-continuation,
.onpv-customer-shell button.onpv-btn-continuation {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-height: 2.75rem;
  padding: 0.75rem 1.15rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--onpv-accent);
  color: var(--onpv-accent-contrast);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  text-decoration: none;
}
.onpv-btn-continuation {
  font-weight: 700;
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 18px rgba(29, 78, 120, 0.22);
}
.onpv-btn-primary:focus-visible,
.onpv-btn-continuation:focus-visible,
.onpv-btn-secondary:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}
.onpv-compare-actions { margin-top: 1rem; }
.onpv-result-continuation {
  margin-top: 1.15rem;
  padding: 1rem 1.05rem;
  border: 2px solid var(--onpv-accent);
  border-radius: 0.65rem;
  background: #e8eef4;
  display: grid;
  gap: 0.55rem;
}
.onpv-result-continuation .onpv-btn-continuation { justify-self: start; }
@media (max-width: 640px) {
  .onpv-compare-actions .onpv-btn-primary,
  .onpv-result-continuation .onpv-btn-continuation { width: 100%; }
}
.onpv-btn-secondary,
a.onpv-btn-secondary {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--onpv-border);
  border-radius: 0.5rem;
  background: #fff;
  color: inherit;
  text-decoration: none;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.onpv-link, .onpv-btn-tertiary {
  background: none;
  border: 0;
  padding: 0;
  color: #52525b;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.875rem;
}
.onpv-signout { margin-top: 0.25rem; }
.onpv-muted { color: #52525b; font-size: 0.875rem; }
.onpv-error { color: #b91c1c; font-size: 0.875rem; }
.onpv-grid { display: grid; gap: 1.5rem; }
@media (min-width: 768px) {
  .onpv-grid--2 { grid-template-columns: 1fr 1fr; }
  .onpv-grid--2 .onpv-col-span { grid-column: 1 / -1; }
}
.onpv-workspace-reopen { margin: 1rem 0 0; } /* legacy isolated reopen; result continuation now lives in the compare panel */
.onpv-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
.onpv-dialog-root { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 1rem; }
.onpv-dialog-backdrop { position: absolute; inset: 0; background: rgba(24, 24, 27, 0.48); }
.onpv-dialog {
  position: relative;
  z-index: 1;
  width: min(52rem, 100%);
  max-height: min(92vh, 52rem);
  overflow: auto;
  background: #f4f6f8;
  border: 1px solid var(--onpv-border);
  border-radius: 0.85rem;
  box-shadow: 0 16px 48px rgba(24, 24, 27, 0.18);
  display: grid;
  gap: 1rem;
  padding: 1.1rem 1.15rem 1rem;
}
.onpv-dialog-header, .onpv-dialog-footer { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap; }
.onpv-dialog-body { display: grid; gap: 1rem; }
.onpv-result-headline { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 650; }
.onpv-result-difference { margin: 0.35rem 0 0; font-weight: 650; }
.onpv-result-cards { display: grid; gap: 0.75rem; }
@media (min-width: 768px) {
  .onpv-result-cards { grid-template-columns: 1fr 1fr; }
}
.onpv-result-card--lower { border-color: var(--onpv-accent); }
.onpv-result-metrics { display: grid; gap: 0.45rem; margin: 0.75rem 0 0; }
.onpv-result-metric { display: grid; gap: 0.1rem; }
.onpv-result-metric dt { color: #52525b; font-size: 0.75rem; }
.onpv-result-metric dd { margin: 0; font-weight: 600; }
.onpv-npv-bars { display: grid; gap: 0.45rem; }
.onpv-npv-bar-row { display: grid; gap: 0.25rem; font-size: 0.8rem; }
.onpv-npv-bar-track { background: #e4e4e7; border-radius: 999px; height: 0.55rem; overflow: hidden; }
.onpv-npv-bar { height: 100%; background: var(--onpv-accent); border-radius: inherit; }
.onpv-table-wrap { overflow-x: auto; margin-top: 0.6rem; }
.onpv-sensitivity table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.onpv-sensitivity th, .onpv-sensitivity td { text-align: left; padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--onpv-border); }
.onpv-dialog-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
@media (max-width: 640px) {
  .onpv-dialog-actions { display: grid; }
  .onpv-dialog-actions .onpv-btn-primary,
  .onpv-dialog-actions .onpv-btn-secondary { width: 100%; }
}
.onpv-customer-shell textarea.onpv-intake-textarea,
.onpv-customer-shell textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--onpv-border);
  border-radius: 0.5rem;
  padding: 0.7rem 0.8rem;
  margin-top: 0.25rem;
  min-height: 5.5rem;
  font: inherit;
}
.onpv-intake-label { display: block; margin-top: 0.75rem; font-size: 0.875rem; font-weight: 600; }
.onpv-intake-dialog-root { z-index: 50; }
.onpv-intake-dialog { width: min(28rem, 100%); max-height: min(90vh, 40rem); }
.onpv-improvement-footer {
  max-width: 56rem;
  margin: 0 auto;
  padding: 1.25rem 0 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}
`;

export default function OccupancynpvAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="onpv-customer-shell min-h-screen">
      <style>{ONPV_CUSTOMER_SHELL_CSS}</style>
      <header className="onpv-appbar">
        <a className="onpv-appbar-brand onpv-brand" href="/occupancynpv/app" aria-label="OccupancyNPV home" data-venture-brand="occupancynpv">
          <span className="onpv-brand-mark" aria-hidden="true" data-venture-logo="compact">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28">
              <rect width="32" height="32" rx="7" fill="#1d4e78"/>
              <circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="4.5"/>
            </svg>
          </span>
          <span className="onpv-brand-wordmark" data-venture-wordmark="true">OccupancyNPV</span>
        </a>
        <nav aria-label="Product">
          <a href="/occupancynpv/app">Dashboard</a>
          <a href="#onpv-help">Help</a>
          <a className="onpv-appbar-site" href="/">Main site</a>
        </nav>
      </header>
      {children}
      <footer className="onpv-improvement-footer" data-venture-improvement-footer="true">
        <p className="onpv-muted">Need a change in the product?</p>
        <OccupancynpvImprovementChrome />
      </footer>
    </div>
  );
}
