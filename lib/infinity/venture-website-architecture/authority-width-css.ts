export const AUTHORITY_WIDTH_CSS = `
:root {
  --pv-authority-shell: 70rem;
  --pv-prose-measure: 52rem;
  --pv-wide-module: 70rem;
}
.vg-container.pv-reading,
.vg-container.pv-prose,
.pv-authority-shell,
.vg-container:has(.sn-block),
.vg-container:has(.pv-source-board),
.vg-container:has(.pv-cta-panel) {
  max-width: min(var(--pv-authority-shell), calc(100% - 4rem));
  width: 100%;
  margin-inline: auto;
}
.pv-reading > p,
.pv-reading > h2,
.pv-reading > h3,
.pv-reading > h4,
.pv-reading > ul,
.pv-reading > ol,
.pv-reading > .ed-highlight,
.pv-reading > .authority-quote,
.pv-reading > .pv-callout,
.pv-reading > .pv-answer,
.pv-prose > p,
.pv-prose > h2,
.pv-prose > h3,
.pv-prose > h4,
.pv-prose > ul,
.pv-prose > ol,
.pv-prose-column {
  max-width: var(--pv-prose-measure);
}
.pv-reading .vg-container,
.pv-prose .vg-container {
  width: 100%;
  max-width: none;
  margin-inline: 0;
}
.sn-block,
.pv-source-board,
.pv-table-shell,
.pv-analysis-board,
.pv-cta-panel,
.pv-edu-figure,
.pv-related-editorial,
.pv-wide-module {
  max-width: none;
  width: 100%;
}
.sn-block {
  margin: 2.6rem 0 2.2rem;
}
.sn-block-head {
  max-width: var(--pv-prose-measure);
  margin-bottom: 1.15rem;
}
.sn-intro {
  margin: 0.45rem 0 0;
  max-width: 40rem;
  color: #3d4b5c;
  font-size: 1rem;
}
.sn-grid {
  display: grid;
  align-items: stretch;
  gap: 1rem;
}
.sn-grid--count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sn-grid--count-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sn-grid--count-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sn-grid--count-5 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.sn-grid--count-5 .sn-card:nth-child(-n+3) { grid-column: span 2; }
.sn-grid--count-5 .sn-card:nth-child(n+4) { grid-column: span 3; }
.sn-grid--count-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sn-card {
  display: flex;
  gap: 0.95rem;
  align-items: flex-start;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 1.15rem 1.2rem 1.2rem;
  border-radius: 16px;
  border: 1px solid rgba(20, 40, 70, 0.1);
  background: #f7f9fc;
  text-decoration: none;
  color: inherit;
}
.sn-card[data-card-role="QUESTION"] { border-left: 3px solid #1d4e89; }
.sn-card[data-card-role="TOPIC"] { border-left: 3px solid #2a6f4e; }
.sn-card[data-card-role="WORKFLOW"] { border-left: 3px solid #5a4a8a; }
.sn-card[data-card-role="TOOL"] { border-left: 3px solid #7a5a1e; }
.sn-card[data-card-role="ROLE"] { border-left: 3px solid #215e6e; }
.sn-role {
  display: block;
  margin: 0 0 0.28rem;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1d4e89;
}
.sn-icon {
  flex: 0 0 3.15rem;
  width: 3.15rem;
  height: 3.15rem;
  border-radius: 14px;
  background: #e4eef8;
  color: #1d4e89;
  display: grid;
  place-items: center;
}
.sn-icon svg {
  width: 1.55rem;
  height: 1.55rem;
  fill: currentColor;
  display: block;
}
.sn-copy { display: block; min-width: 0; }
.sn-copy strong,
.sn-title-line,
.sn-desc {
  text-wrap: balance;
}
.sn-copy strong {
  display: block;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.3;
}
.sn-desc {
  display: block;
  margin: 0.35rem 0 0;
  color: #4a5564;
  font-size: 0.95rem;
  line-height: 1.4;
}
.sn-card:focus-visible {
  outline: 2px solid #1d4e89;
  outline-offset: 3px;
}
.pv-source-board {
  margin: 2rem 0 0;
  padding: 1.35rem 1.4rem;
  border-radius: 16px;
  background: #f6f8fb;
}
.pv-source-board h2 { margin: 0; }
.pv-source-board > p {
  max-width: 40rem;
  margin: 0.45rem 0 0;
}
.pv-source-board ol {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1.6rem;
  margin: 0.95rem 0 0;
  padding-left: 1.15rem;
}
.pv-source-board li { margin: 0; }
.pv-source-board a { font-weight: 600; }
.pv-cta-panel { width: 100%; }
.pv-legal-page .pv-reading,
.pv-legal-page .pv-prose,
.pv-legal-page .pv-authority-shell {
  max-width: 46rem;
}
@media (max-width: 1100px) {
  .sn-grid--count-3,
  .sn-grid--count-6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sn-grid--count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sn-grid--count-5 .sn-card { grid-column: auto; }
}
@media (max-width: 768px) {
  .vg-container.pv-reading,
  .pv-authority-shell { max-width: calc(100% - 2.5rem); }
  .sn-grid--count-2,
  .sn-grid--count-3,
  .sn-grid--count-4,
  .sn-grid--count-6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pv-source-board ol { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .sn-grid,
  .sn-grid--count-2,
  .sn-grid--count-3,
  .sn-grid--count-4,
  .sn-grid--count-5,
  .sn-grid--count-6 { grid-template-columns: 1fr; }
  .sn-grid--count-5 .sn-card { grid-column: auto; }
  .pv-source-board ol { grid-template-columns: 1fr; }
}
`;

export function applyAuthorityWidthCss(existing: string): string {
  if (existing.includes("--pv-authority-shell") && existing.includes("sn-grid--count-4")) return existing;
  return `${existing}\n${AUTHORITY_WIDTH_CSS}\n`;
}
