import { innerPageShell } from "./page-sources";
import { hubLabel } from "./digital-real-estate-catalog";
import { extendYears, narrateYears, type YearRow } from "./digital-real-estate-content";
import { canonicalQuestionId } from "./answer-authority/question-system";
import { VISUAL_ASSET_PLANS, type PageVisualAssetPlan } from "./visual-quality-assets";
import { plannedExpansionQuestionPage, EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import type { ExpansionPageSpec } from "./authority-expansion-specs";

function p(text: string): string {
  return `<p>${text}</p>`;
}

function paras(items: string[]): string {
  return items.map(p).join("\n            ");
}

function list(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function chunkYearNotes(lines: string[]): string {
  const notes = [...lines];
  const close = notes.pop();
  const groups: string[] = [];
  for (let index = 0; index < notes.length; index += 5) {
    groups.push(list(notes.slice(index, index + 5)));
  }
  return `${groups.join("\n              ")}${close ? p(close) : ""}`;
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
    .map(
      (row) =>
        `<tr>${row.map((cell, cellIndex) => (cellIndex === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join("")}</tr>`,
    )
    .join("");
  return `<div className="pv-table-shell" data-visualization=${JSON.stringify(viz)}><table className="pv-fin-table"><caption className="pv-caption">${caption}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function expansionHeroForRoute(route: string): PageVisualAssetPlan {
  if (route.includes("occupancy-costs") || route.includes("effective-rent")) return VISUAL_ASSET_PLANS[1];
  if (route.includes("lease-comparison") || route.includes("lease-sensitivity") || route.includes("lease-financial")) {
    return VISUAL_ASSET_PLANS[3];
  }
  return VISUAL_ASSET_PLANS[2];
}

function breadcrumbs(spec: ExpansionPageSpec): string {
  const page = plannedExpansionQuestionPage(EXPANSION_QUESTION_PAGES.find((item) => item.route === spec.route)!);
  const items = [
    { href: "/", label: "Home" },
    { href: page.parentHub, label: hubLabel(page.parentHub ?? "") },
    { href: spec.route, label: spec.question },
  ];
  return `<SiteBreadcrumb items={${JSON.stringify(items)}} />`;
}

function photoHero(spec: ExpansionPageSpec, questionId: string): string {
  const asset = expansionHeroForRoute(spec.route);
  return `<header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO" data-above-fold-visual="true">
          <figure className="pv-hero-media">
            <img src=${JSON.stringify(asset.publicPath)} alt=${JSON.stringify(asset.altTextIntent)} width={${asset.performance.width}} height={${asset.performance.height}} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">${spec.route.split("/").filter(Boolean)[0]?.replace(/-/g, " ")}</p>
            <h1 className="pv-display">${spec.question}</h1>
            <div data-question-id=${JSON.stringify(questionId)} data-answer-chunk-id=${JSON.stringify(`${questionId}_chunk`)}>
              <AnswerFirst question=${JSON.stringify(spec.question)} answer=${JSON.stringify(spec.directAnswer)} />
            </div>
            <p>This page belongs to a validation / pilot concept. It is not generally available.</p>
            <div className="pv-cta-panel">
              <p><PrimaryCTA href=${JSON.stringify(spec.cta.href)}>${spec.cta.label}</PrimaryCTA></p>
            </div>
          </div>
        </header>`;
}

function surfaceBlock(spec: ExpansionPageSpec): string {
  return spec.surfaces
    .map((item, index) => {
      const id = `${canonicalQuestionId(item.question)}_${index}`;
      return `<div data-question-id=${JSON.stringify(canonicalQuestionId(item.question))} data-answer-chunk-id=${JSON.stringify(id)} data-supporting-section="define">
              <AnswerFirst question=${JSON.stringify(item.question)} answer=${JSON.stringify(item.answer)} />
            </div>`;
    })
    .join("\n            ");
}

function relatedEditorial(spec: ExpansionPageSpec): string {
  const groups = spec.relatedGroups
    .map(
      (group) =>
        `<div className="pv-related-family"><h3>${group.title}</h3>
            <RelatedContent items={${JSON.stringify(group.items)}} /></div>`,
    )
    .join("\n            ");
  const fallback = spec.related.map((item) => ({
    href: item.href,
    label: item.label,
    description: "A nearby page that helps finish this comparison.",
  }));
  return `<div className="pv-related-editorial" data-related-architecture="true">
            <h2>Related reading</h2>
            ${groups || `<RelatedContent items={${JSON.stringify(fallback.slice(0, 4))}} />`}
          </div>`;
}

export function renderExpansionAuthorityPage(spec: ExpansionPageSpec): string {
  const page = plannedExpansionQuestionPage(EXPANSION_QUESTION_PAGES.find((item) => item.route === spec.route)!);
  const questionId = canonicalQuestionId(spec.question);
  const years = extendYears(spec.years);
  const optionB = otherYears(spec.years);
  const npvA = sampleNpv(spec.years, spec.rate);
  const npvB = sampleNpv(optionB, spec.rate);
  const siblings = EXPANSION_QUESTION_PAGES.filter((item) => item.hub === page.parentHub && item.route !== spec.route).map(
    (item) => ({
      href: item.route,
      label: item.question,
      description: "Another question in this same topic.",
    }),
  );
  const cashRows = years.map((row, index) => {
    const cash = row.rent + row.cam - row.credit;
    const pv = cash / (1 + spec.rate) ** (index + 1);
    return [`Year ${index + 1}`, money(row.rent), money(row.cam), money(row.credit), money(cash), money(pv)];
  });
  cashRows.push(["Sample NPV", "—", "—", "—", "—", money(npvA)]);
  const body = `
        ${photoHero(spec, questionId)}
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces">
          <div className="vg-container pv-reading">
            <h2>Questions this page also answers</h2>
            ${surfaceBlock(spec)}
          </div>
        </section>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            ${paras(spec.definition)}
            <p>This page sits under <a href=${JSON.stringify(`${page.parentHub}/`)}>${hubLabel(page.parentHub ?? "")}</a>.</p>
            ${paras(spec.bodyLinks.map((item) => item.sentence))}
            ${callout("KEY_TAKEAWAY", "Key takeaway", spec.directAnswer)}
            <p>Investopedia defines net present value as later cash brought back to today. That idea is the spine of this page. See <a href="https://www.investopedia.com/terms/n/npv.asp">Investopedia on NPV</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why">
          <figure className="pv-section-visual-media">
            <img src=${JSON.stringify(expansionHeroForRoute(spec.route).publicPath === "/media/hero-interior.webp" ? "/media/hero-building.webp" : "/media/hero-interior.webp")} alt="Editorial commercial interior used as section context. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
          </figure>
          <div className="vg-container pv-reading">
            <h2>Why it matters</h2>
            ${paras(spec.why)}
            ${callout("WHY_THIS_MATTERS", "Why this matters", spec.why[0] ?? spec.directAnswer)}
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how">
          <div className="vg-container pv-reading">
            <h2>How it works</h2>
            <p>Write the cash list first. Then decide what the page is measuring.</p>
            ${list(spec.how)}
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. ${spec.formula.replace(/</g, "&lt;")}</p>
            ${table("Required inputs for this page", ["Input", "Meaning"], spec.inputs, "ASSUMPTION_TABLE")}
          </div>
        </section>
        <section className="pv-section" data-section-type="EXAMPLE" data-section-id="example">
          <div className="vg-container pv-breakout">
            <div className="pv-analysis-board" data-worked-example="true">
              <h2>Worked example</h2>
              <p>Here is a teaching sample. It is not customer data and not a result from a live client.</p>
              <div className="pv-metric-row">
                <div className="pv-metric-card"><span>Lease A start rent</span><strong>${money(years[0]?.rent ?? 0)}</strong></div>
                <div className="pv-metric-card"><span>Lease B start rent</span><strong>${money(optionB[0]?.rent ?? 0)}</strong></div>
                <div className="pv-metric-card"><span>Discount rate</span><strong>${Math.round(spec.rate * 100)}%</strong></div>
                <div className="pv-metric-card"><span>Sample NPV A</span><strong>${money(npvA)}</strong></div>
              </div>
              ${table(
                `Lease A vs Lease B — ${spec.exampleName}`,
                ["Metric", "Lease A", "Lease B"],
                [
                  ["Start rent", money(years[0]?.rent ?? 0), money(optionB[0]?.rent ?? 0)],
                  ["Year-1 extras", money(years[0]?.cam ?? 0), money(optionB[0]?.cam ?? 0)],
                  ["Year-1 credit", money(years[0]?.credit ?? 0), money(optionB[0]?.credit ?? 0)],
                  ["Sample NPV", money(npvA), money(npvB)],
                ],
                "LEASE_OPTION_COMPARISON",
              )}
              ${table(
                `Cash-flow walk — ${spec.exampleName}`,
                ["Year", "Rent", "Extras", "Credit", "Cash out", "Value today"],
                cashRows,
                "CASH_FLOW_TIMELINE",
              )}
              <figure className="pv-edu-figure" data-visualization="NPV_COMPARISON">
                <img src="/media/viz-compare.svg" alt="Two bars on one scale for Lease A and Lease B. Teaching sample only." width={720} height={220} loading="lazy" decoding="async" />
                <figcaption>Both options use the same rate. The lower bar is not automatically the better lease.</figcaption>
              </figure>
              <div className="pv-decision-takeaway">
                <h3>How to read the sample</h3>
                <p>Sample NPV for ${spec.exampleName} is about ${money(npvA)}. A second path lands near ${money(npvB)}. That gap is a talking point, not a promise.</p>
              </div>
              <h3>Year notes for ${spec.exampleName}</h3>
              ${chunkYearNotes(narrateYears(spec.exampleName, spec.years, spec.rate))}
              ${callout("WORKED_EXAMPLE", "Worked example", `The sample walk for ${spec.exampleName} is here so you can see the cash move. It is not a promise.`)}
              <p><PrimaryCTA href=${JSON.stringify(spec.midCta.href)}>${spec.midCta.label}</PrimaryCTA></p>
            </div>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions">
          <div className="vg-container pv-reading">
            <h2>Assumptions</h2>
            ${list(spec.assumptions)}
            ${callout("WHAT_CHANGES", "What changes the result", spec.assumptions[0] ?? "A missing extra or a hidden rate can move the rank.")}
          </div>
        </section>
        <section className="pv-section" data-section-type="EDGE_CASES" data-section-id="edges">
          <div className="vg-container pv-reading">
            <h2>Edge cases</h2>
            ${paras(spec.edges)}
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes">
          <div className="vg-container pv-reading">
            <h2>Common mistakes</h2>
            ${list(spec.mistakes)}
            ${callout("COMMON_MISTAKE", "Common mistake", spec.mistakes[0] ?? "Leaving an extra off the list.")}
          </div>
        </section>
        <section className="pv-section" data-section-type="DECISION" data-section-id="decide">
          <div className="vg-container pv-reading">
            <h2>Decision implications</h2>
            ${paras(spec.decisions)}
            <h2>Compare this to related metrics</h2>
            ${paras(spec.compare)}
            ${
              spec.personaNote
                ? callout(
                    spec.personaNote.title.toUpperCase().includes("FINANCE") ? "FOR_FINANCE" : "FOR_TENANT_REP",
                    spec.personaNote.title,
                    spec.personaNote.body,
                  )
                : ""
            }
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits">
          <div className="vg-container pv-reading">
            <h2>Limits</h2>
            ${list(spec.limits)}
            <h2>When this should not drive the choice</h2>
            ${list(spec.whenNot)}
            ${callout("LIMITATION", "Limitation", spec.limits[0] ?? "This number does not replace a legal review.")}
            <p>U.S. BLS describes how brokers advise clients on property deals. That is the job this page supports. See <a href="https://www.bls.gov/ooh/sales/real-estate-brokers-and-sales-agents.htm">BLS broker occupation data</a>.</p>
            <p>NAIOP and BOMA are professional CRE homes for market and building-cost context. See <a href="https://www.naiop.org/">NAIOP</a> and <a href="https://www.boma.org/">BOMA</a>.</p>
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta=${JSON.stringify(spec.finalCta.label)} data-search-intent=${JSON.stringify(EXPANSION_QUESTION_PAGES.find((item) => item.route === spec.route)?.searchIntent)}>
          <div className="vg-container pv-reading">
            <div className="pv-cta-panel">
              <h2>Next step</h2>
              <p>This site is a validation / pilot concept. It is not generally available. Payment is not collected.</p>
              <p><PrimaryCTA href=${JSON.stringify(spec.finalCta.href)}>${spec.finalCta.label}</PrimaryCTA></p>
              <p>Ready for a bounded next step? <a href="/early-access">Request Pilot Access</a> or <a href="/how-it-works">see how it works</a> and <a href="/compare-commercial-leases">compare commercial leases</a>.</p>
            </div>
            ${
              siblings.length
                ? `<p className="pv-spoke-index">${siblings.map((item) => `<a href=${JSON.stringify(item.href)}>${item.label}</a>`).join(" · ")}</p>`
                : ""
            }
            ${relatedEditorial(spec)}
            <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES">
              <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={${JSON.stringify(spec.sources.map((item) => ({ href: item.href, label: item.label })))}} />
            </section>
            <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure>
          </div>
        </section>`;
  const source = innerPageShell({ page, importDepth: "../../../", body });
  return source.replace(/<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/, breadcrumbs(spec));
}
