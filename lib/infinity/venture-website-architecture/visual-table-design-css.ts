export const VISUAL_TABLE_DESIGN_CSS = `
.pv-worked-ledger {
  margin: 1.5rem 0 1.75rem;
  padding: 1.35rem 1.4rem 1.45rem;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(16, 32, 51, 0.1);
  box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
}
.pv-worked-ledger > h2 { margin-top: 0; }
.pv-worked-ledger > p:first-of-type {
  max-width: 42rem;
  margin: 0 0 1rem;
  font-size: 0.78rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #5a6573;
}
.pv-data-panel.pv-table-designed,
.pv-table-shell {
  width: 100%;
  max-width: 100%;
  margin: 1rem 0 0;
  padding: 0;
  overflow-x: auto;
  background: #f7f9fc;
  color: #102033;
  border: 1px solid rgba(16, 32, 51, 0.1);
  border-radius: 14px;
  box-shadow: none;
}
.pv-analysis-board {
  background: #fff;
  border: 1px solid rgba(16, 32, 51, 0.1);
  box-shadow: 0 12px 32px rgba(16, 32, 51, 0.05);
  padding: 1.35rem 1.4rem;
}
.pv-analysis-board .pv-table-shell { margin-top: 1rem; }
table.pv-compare,
.pv-fin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.94rem;
}
.pv-compare caption,
.pv-fin-table caption,
.pv-caption {
  caption-side: top;
  text-align: left;
  padding: 0.85rem 1rem 0.3rem;
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a6573;
}
.pv-compare thead th,
.pv-fin-table thead th {
  background: #14253a;
  color: #f4f7fb;
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 650;
  padding: 0.75rem 1rem;
  text-align: right;
  border-bottom: 0;
}
.pv-compare thead th:first-child,
.pv-fin-table thead th:first-child { text-align: left; }
.pv-compare th,
.pv-compare td,
.pv-fin-table th,
.pv-fin-table td {
  padding: 0.72rem 1rem;
  border-bottom: 1px solid rgba(16, 32, 51, 0.08);
  vertical-align: top;
}
.pv-compare tbody th,
.pv-fin-table tbody th {
  text-align: left;
  font-weight: 650;
  color: #102033;
  background: transparent;
}
.pv-compare tbody td,
.pv-fin-table tbody td {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.pv-compare tbody tr:nth-child(even),
.pv-fin-table tbody tr:nth-child(even) {
  background: rgba(20, 37, 58, 0.035);
}
.pv-compare tbody tr:last-child,
.pv-fin-table tbody tr:last-child {
  background: #e8eef6;
  font-weight: 650;
}
.pv-compare tbody tr:last-child th,
.pv-compare tbody tr:last-child td,
.pv-fin-table tbody tr:last-child th,
.pv-fin-table tbody tr:last-child td {
  border-bottom: 0;
}
.pv-cell-note {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #5a6573;
  white-space: normal;
  text-align: right;
}
.pv-decision-takeaway {
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: #eef3f8;
  border: 1px solid rgba(16, 32, 51, 0.08);
  color: #102033;
}
.pv-worked-ledger .pv-bar {
  height: 8px;
  margin-top: 1.05rem;
  background: #e6edf5;
  border-radius: 99px;
  overflow: hidden;
}
.pv-worked-ledger .pv-bar > span { background: #1d4e89; }
@media (max-width: 640px) {
  .pv-worked-ledger { padding: 1.05rem 0.95rem 1.15rem; }
  .pv-compare th, .pv-compare td, .pv-fin-table th, .pv-fin-table td { padding: 0.62rem 0.75rem; }
}
`;

export function applyVisualTableDesignCss(existing: string): string {
  if (existing.includes("pv-worked-ledger")) return existing;
  return `${existing}\n${VISUAL_TABLE_DESIGN_CSS}\n`;
}
