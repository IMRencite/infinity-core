import type { ReactNode } from "react";
import { OccupancynpvImprovementChrome } from "../app/occupancynpv-improvement-chrome";

export const metadata = {
  title: "Affiliate Program",
  description: "OccupancyNPV affiliate and referral program for commercial real-estate professionals.",
};

const AFFILIATE_SHELL_CSS = `
.onpv-customer-shell { --onpv-gutter: 1.25rem; --onpv-accent: #1d4e78; --onpv-accent-contrast: #fff; --onpv-border: #d4d4d8; min-height: 100vh; background: #f4f6f8; color: #18181b; padding-inline: var(--onpv-gutter); }
.onpv-appbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; max-width: 56rem; margin: 0 auto; padding: 1rem 0 0.25rem; }
.onpv-appbar a, .onpv-link { color: inherit; }
.onpv-page { margin-inline: auto; width: 100%; max-width: 56rem; padding-block: 1.25rem 2.5rem; box-sizing: border-box; }
.onpv-kicker { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--onpv-accent); }
.onpv-customer-shell h1 { font-size: 1.65rem; font-weight: 650; margin: 0; }
.onpv-customer-shell h2 { font-size: 1rem; font-weight: 650; margin: 1rem 0 0; }
.onpv-lede, .onpv-customer-shell p { margin: 0.4rem 0 0; color: #3f3f46; }
.onpv-card { background: #fff; border: 1px solid var(--onpv-border); border-radius: 0.75rem; padding: 1rem 1.1rem; margin-top: 1rem; }
.onpv-btn-primary { display: inline-flex; align-items: center; min-height: 2.75rem; padding: 0.75rem 1.15rem; border-radius: 0.5rem; background: var(--onpv-accent); color: #fff; text-decoration: none; font-weight: 650; border: 0; cursor: pointer; }
.onpv-customer-shell input { display: block; width: 100%; box-sizing: border-box; border: 1px solid var(--onpv-border); border-radius: 0.5rem; padding: 0.7rem 0.8rem; margin-top: 0.25rem; }
.onpv-customer-shell label { display: block; margin-top: 0.75rem; }
`;

export default function OccupancyNpvAffiliatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="onpv-customer-shell" data-occupancynpv-affiliates="true">
      <style>{AFFILIATE_SHELL_CSS}</style>
      <header className="onpv-appbar">
        <a className="onpv-appbar-brand onpv-brand" href="https://occupancynpv.com" data-venture-brand="occupancynpv">
          OccupancyNPV
        </a>
        <nav>
          <a href="/occupancynpv/affiliates">Program</a>
          <a href="/occupancynpv/affiliates/apply">Apply</a>
          <a href="/occupancynpv/affiliates/portal">Portal</a>
          <a href="/occupancynpv/affiliates/terms">Terms</a>
        </nav>
      </header>
      {children}
      <OccupancynpvImprovementChrome contextual label="Suggest an affiliate-program improvement" workflow="affiliates" />
    </div>
  );
}
