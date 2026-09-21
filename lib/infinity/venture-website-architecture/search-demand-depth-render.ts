import { innerPageShell } from "./page-sources";
import { hubLabel, SEO_GEO_QUESTION_PAGES } from "./digital-real-estate-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { extendYears, narrateYears, type YearRow } from "./digital-real-estate-content";
import { canonicalQuestionId } from "./answer-authority/question-system";
import { VISUAL_ASSET_PLANS } from "./visual-quality-assets";
import { DEPTH_QUESTION_PAGES, plannedDepthQuestionPage } from "./search-demand-depth-catalog";
import type { ExpansionPageSpec } from "./authority-expansion-specs";
import { expansionHeroForRoute } from "./authority-expansion-render";

function p(text: string): string {
  return `<p>${text}</p>`;
}
function paras(items: string[]): string {
  return items.map(p).join("\n            ");
}
function list(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}
function callout(kind: string, title: string, body: string): string {
  return `<aside className="pv-callout" data-callout=${JSON.stringify(kind)}><h3>${title}</h3>${p(body)}</aside>`;
}
function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
function sampleNpv(years: YearRow[], rate: number): number {
  return extendYears(years).reduce((sum, row, index) => {
    const cash = row.rent + row.cam - row.credit;
    return sum + cash / (1 + rate) ** (index + 1);
  }, 0);
}
function otherYears(years: YearRow[]): YearRow[] {
  return extendYears(years).map((row) => ({
    rent: Math.round(row.rent * 0.93),
    cam: Math.round(row.cam * 1.07),
    credit: Math.round(row.credit * 0.55),
    note: "This other option trades a lower face rent for heavier extras.",
  }));
}
function table(caption: string, headers: string[], rows: string[][], viz: string): string {
  const head = headers.map((item) => `<th scope="col">${item}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell, cellIndex) => (cellIndex === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join("")}</tr>`)
    .join("");
  return `<div className="pv-table-shell pv-wide-module" data-visualization=${JSON.stringify(viz)}><table className="pv-fin-table"><caption className="pv-caption">${caption}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function topicPages(hub: string, self: string) {
  return [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES, ...DEPTH_QUESTION_PAGES]
    .filter((item) => item.hub === hub && item.route !== self)
    .map((item) => ({ href: item.route.endsWith("/") ? item.route : `${item.route}/`, label: item.question }));
}

export function renderDepthAuthorityPage(spec: ExpansionPageSpec): string {
  const catalog = DEPTH_QUESTION_PAGES.find((item) => item.route === spec.route);
  if (!catalog) throw new Error(`depth_render_missing:${spec.route}`);
  const page = plannedDepthQuestionPage(catalog);
  const questionId = canonicalQuestionId(spec.question);
  const years = extendYears(spec.years);
  const optionB = otherYears(spec.years);
  const npvA = sampleNpv(spec.years, spec.rate);
  const npvB = sampleNpv(optionB, spec.rate);
  const siblings = topicPages(page.parentHub ?? catalog.hub, spec.route);
  const cashRows = years.map((row, index) => {
    const cash = row.rent + row.cam - row.credit;
    const pv = cash / (1 + spec.rate) ** (index + 1);
    return [`Year ${index + 1}`, money(row.rent), money(row.cam), money(row.credit), money(cash), money(pv)];
  });
  cashRows.push(["Sample NPV", "—", "—", "—", "—", money(npvA)]);
  const asset = expansionHeroForRoute(spec.route);
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true" data-surface="DEFAULT">
          <figure className="pv-hero-media">
            <img src=${JSON.stringify(asset.publicPath)} alt=${JSON.stringify(asset.altTextIntent)} width={${asset.performance.width}} height={${asset.performance.height}} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">${catalog.topic.replace(/-/g, " ")}</p>
            <h1 className="pv-display">${spec.question}</h1>
            <div data-question-id=${JSON.stringify(questionId)} data-answer-chunk-id=${JSON.stringify(`${questionId}_chunk`)}>
              <AnswerFirst question=${JSON.stringify(spec.question)} answer=${JSON.stringify(spec.directAnswer)} />
            </div>
            <p>This page belongs to a validation / pilot concept. It is not generally available. Payment is not collected.</p>
            <div className="pv-cta-panel pv-wide-module">
              <p><PrimaryCTA href=${JSON.stringify(spec.cta.href)}>${spec.cta.label}</PrimaryCTA></p>
            </div>
          </div>
        </header>
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            ${spec.surfaces
              .map((item, index) => {
                const id = `${canonicalQuestionId(item.question)}_${index}`;
                return `<div data-question-id=${JSON.stringify(canonicalQuestionId(item.question))} data-answer-chunk-id=${JSON.stringify(id)}><AnswerFirst question=${JSON.stringify(item.question)} answer=${JSON.stringify(item.answer)} /></div>`;
              })
              .join("\n            ")}
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            ${paras(spec.definition)}
            <p>This page sits under <a href=${JSON.stringify(`${page.parentHub}/`)}>${hubLabel(page.parentHub ?? "")}</a>.</p>
            ${paras(spec.bodyLinks.map((item) => item.sentence))}
            ${callout("KEY_TAKEAWAY", "Key takeaway", spec.directAnswer)}
            <p>Investopedia defines net present value as later cash brought back to today. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why" data-surface="SUBTLE">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            ${paras(spec.why)}
            ${callout("DECISION_NOTE", "What this changes", spec.why[0] ?? spec.directAnswer)}
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            ${list(spec.how)}
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. Teaching picture only.</figcaption>
            </figure>
            <p>Formula in words. ${spec.formula.replace(/</g, "&lt;")}</p>
            ${table("Required inputs for this page", ["Input", "Meaning"], spec.inputs, "ASSUMPTION_TABLE")}
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example" data-surface="SUBTLE">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board pv-wide-module" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              ${table(
                `${spec.exampleName} — two paths`,
                ["Metric", "Path A", "Path B"],
                [
                  ["Start rent", money(years[0]?.rent ?? 0), money(optionB[0]?.rent ?? 0)],
                  ["Year-1 extras", money(years[0]?.cam ?? 0), money(optionB[0]?.cam ?? 0)],
                  ["Year-1 credit", money(years[0]?.credit ?? 0), money(optionB[0]?.credit ?? 0)],
                  ["Sample NPV", money(npvA), money(npvB)],
                ],
                "LEASE_OPTION_COMPARISON",
              )}
              ${table(`Cash-flow walk — ${spec.exampleName}`, ["Year", "Rent", "Extras", "Credit", "Cash out", "Value today"], cashRows, "CASH_FLOW_TIMELINE")}
              <p>Sample NPV for ${spec.exampleName} is about ${money(npvA)}. A second path lands near ${money(npvB)}.</p>
              ${paras(narrateYears(spec.exampleName, spec.years, spec.rate).slice(0, 6))}
              <p><PrimaryCTA href=${JSON.stringify(spec.midCta.href)}>${spec.midCta.label}</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            ${list(spec.assumptions)}
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges" data-surface="TINTED">
          <div className="vg-container pv-reading">
            <h2>Edge cases</h2>
            ${paras(spec.edges)}
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes" data-surface="SUBTLE">
          <div className="vg-container pv-reading">
            <h2>Common mistakes</h2>
            ${list(spec.mistakes)}
            ${callout("COMMON_MISTAKE", "Common mistake", spec.mistakes[0] ?? "Leaving an extra off the list.")}
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide" data-surface="EDITORIAL">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            ${paras(spec.decisions)}
            ${paras(spec.compare)}
            ${spec.personaNote ? callout("FOR_YOUR_ROLE", spec.personaNote.title, spec.personaNote.body) : ""}
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits" data-surface="DEFAULT">
          <div className="vg-container pv-reading">
            <h2>Limits</h2>
            ${list(spec.limits)}
            ${list(spec.whenNot)}
            <p>U.S. BLS describes how brokers advise clients on property deals. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a> for professional context.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-search-intent=${JSON.stringify(catalog.searchIntent)} data-surface="EMPHASIS">
          <div className="vg-container pv-reading">
            <div className="pv-cta-panel pv-wide-module">
              <h2>Next step</h2>
              <p>This site is a validation / pilot concept. It is not generally available. Payment is not collected.</p>
              <p><PrimaryCTA href=${JSON.stringify(spec.finalCta.href)}>${spec.finalCta.label}</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            <p className="pv-spoke-index">${siblings.slice(0, 8).map((item) => `<a href=${JSON.stringify(item.href)}>${item.label}</a>`).join(" · ")}</p>
          </div>
        </section>
        <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES" data-surface="SUBTLE">
          <h2>Trusted sources</h2>
          <p>These are public references. They are not endorsements and not client results.</p>
          <AuthorityRefs items={${JSON.stringify(spec.sources.map((item) => ({ href: item.href, label: item.label })))}} />
        </section>
        <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure>`;
  const crumbs = [
    { href: "/", label: "Home" },
    { href: page.parentHub, label: hubLabel(page.parentHub ?? "") },
    { href: spec.route, label: spec.question },
  ];
  return innerPageShell({ page, importDepth: "../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}
