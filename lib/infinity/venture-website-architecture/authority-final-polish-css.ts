export const AUTHORITY_FINAL_POLISH_CSS = `
.ed-highlight {
  margin: 1.6rem 0;
  padding: 1.05rem 1.2rem 1.15rem;
  border-radius: 14px;
  border: 1px solid rgba(20, 40, 70, 0.1);
  background: #f4f7fb;
  max-width: 42rem;
}
.ed-highlight-kicker,
.ed-highlight h3,
.pv-callout h3 {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1d4e89;
}
.ed-highlight-body p,
.ed-highlight p,
.pv-callout p { margin: 0; color: #1c2838; }
.ed-highlight--key_takeaway,
.pv-callout[data-callout="KEY_TAKEAWAY"] { border-left: 4px solid #1d4e89; background: #f3f7fc; }
.ed-highlight--why_this_matters,
.pv-callout[data-callout="WHY_THIS_MATTERS"] { border-left: 4px solid #5a4a8a; background: #f7f4fb; }
.ed-highlight--decision_note,
.ed-highlight--what_changes_the_result,
.pv-callout[data-callout="WHAT_CHANGES"] { border-left: 4px solid #7a5a1e; background: #fbf6ee; }
.ed-highlight--common_mistake,
.pv-callout[data-callout="COMMON_MISTAKE"] { border-left: 4px solid #8a3b2f; background: #fbf4f2; }
.ed-highlight--when_to_be_careful,
.pv-callout[data-callout="LIMITATION"] { border-left: 4px solid #4a5564; background: #f4f5f7; }
.ed-highlight--for_your_role,
.pv-callout[data-callout="FOR_TENANT_REP"] { border-left: 4px solid #215e6e; background: #f1f8f8; }
.ed-highlight--for_finance_teams,
.pv-callout[data-callout="FOR_FINANCE"] { border-left: 4px solid #3d5a80; background: #f2f6fb; }
.authority-quote {
  margin: 1.75rem auto;
  padding: 0.2rem 0 0.2rem 1.15rem;
  max-width: 38rem;
  border-left: 3px solid #1d4e89;
  background: transparent;
}
.authority-quote blockquote {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.45;
  color: #16324f;
}
.authority-quote footer {
  margin-top: 0.55rem;
  font-size: 0.86rem;
  color: #4a5564;
}
.sn-block { margin: 2.4rem 0 2.1rem; }
.sn-block-head { margin-bottom: 1.05rem; max-width: 40rem; }
.sn-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1d4e89;
}
.sn-title { display: block; margin: 0; font-size: 1.45rem; font-weight: 700; }
.sn-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}
.sn-card {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  min-height: 0;
  padding: 1rem 1.05rem 1.05rem;
  border-radius: 16px;
  border: 1px solid rgba(20, 40, 70, 0.1);
  background: #f7f9fc;
  text-decoration: none;
  color: inherit;
  box-shadow: none;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.sn-card:hover,
.sn-card:focus-visible {
  border-color: rgba(29, 78, 137, 0.35);
  background: #eef4fb;
  transform: translateY(-1px);
  outline: none;
}
.sn-icon {
  flex: 0 0 2.4rem;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  background: #e4eef8;
  color: #1d4e89;
  display: grid;
  place-items: center;
}
.sn-icon svg { width: 1.15rem; height: 1.15rem; display: block; }
.sn-copy { display: block; }
.sn-copy strong { display: block; font-size: 1rem; font-weight: 650; }
.sn-desc { display: block; margin: 0.35rem 0 0; color: #4a5564; font-size: 0.92rem; }
@media (max-width: 960px) {
  .sn-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .sn-grid { grid-template-columns: 1fr; }
  .ed-highlight, .authority-quote { margin-left: 0; margin-right: 0; }
}
`;

export function applyAuthorityFinalPolishCss(existing: string): string {
  if (existing.includes(".sn-block") && existing.includes(".ed-highlight")) return existing;
  return `${existing}\n${AUTHORITY_FINAL_POLISH_CSS}\n`;
}
