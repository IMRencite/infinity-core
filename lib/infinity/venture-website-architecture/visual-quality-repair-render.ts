import { innerPageShell } from "./page-sources";
import { hubLabel, plannedHubPage, plannedQuestionPage, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { extendYears, narrateYears, type AuthorityPageSpec, type YearRow } from "./digital-real-estate-content";
import { canonicalQuestionId } from "./answer-authority/question-system";
import { heroAssetForRoute } from "./visual-quality-assets";
import type { PlannedPage } from "./types";

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

function plannedFor(spec: AuthorityPageSpec): PlannedPage {
  const route = spec.route.replace(/\/+$/, "") || "/";
  const question = SEO_GEO_QUESTION_PAGES.find((item) => item.route === route);
  if (question) return plannedQuestionPage(question);
  const hub = SEO_GEO_TOPIC_HUBS.find((item) => item.route === route);
  if (hub) return plannedHubPage(hub);
  throw new Error(`planned_missing:${spec.route}`);
}

function importDepth(route: string): "../../" | "../" | "../../../" {
  const parts = route.split("/").filter(Boolean);
  if (parts.length >= 2) return "../../../";
  return "../../";
}

function breadcrumbs(spec: AuthorityPageSpec): string {
  const page = plannedFor(spec);
  const items = [{ href: "/", label: "Home" }];
  if (page.parentHub && page.parentHub !== "/") {
    items.push({ href: page.parentHub, label: hubLabel(page.parentHub) });
  }
  items.push({ href: spec.route, label: spec.question });
  return `<SiteBreadcrumb items={${JSON.stringify(items)}} />`;
}

function photoHero(spec: AuthorityPageSpec, questionId: string): string {
  const asset = heroAssetForRoute(spec.route);
  return `<header className="pv-hero pv-article-hero pv-hero-photo" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO">
          <figure className="pv-hero-media">
            <img src=${JSON.stringify(asset.publicPath)} alt=${JSON.stringify(asset.altTextIntent)} width={${asset.performance.width}} height={${asset.performance.height}} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />
          <div className="vg-container pv-reading pv-hero-copy">
            <p className="pv-eyebrow">${plannedFor(spec).topicCluster.replace(/-/g, " ")}</p>
            <h1 className="pv-display">${spec.question}</h1>
            <div data-question-id=${JSON.stringify(questionId)} data-answer-chunk-id=${JSON.stringify(`${questionId}_chunk`)}>
              <AnswerFirst question=${JSON.stringify(spec.question)} answer=${JSON.stringify(spec.directAnswer)} />
            </div>
            <div className="pv-cta-panel">
              <p>The page belongs to a validation / pilot concept. It is not generally available.</p>
              <p><PrimaryCTA href=${JSON.stringify(spec.cta.href)}>${spec.cta.label}</PrimaryCTA></p>
            </div>
          </div>
        </header>`;
}

export function renderVisualQualityAuthorityPage(spec: AuthorityPageSpec): string {
  const page = plannedFor(spec);
  const questionId = canonicalQuestionId(spec.question);
  const years = extendYears(spec.years);
  const optionB = otherYears(spec.years);
  const npvA = sampleNpv(spec.years, spec.rate);
  const npvB = sampleNpv(optionB, spec.rate);
  const spokes = SEO_GEO_QUESTION_PAGES.filter((item) => item.hub === spec.route).map((item) => ({
    href: item.route,
    label: item.question,
    description: "A question page in this same topic. Read it when you need the next definition.",
  }));
  const related = [
    ...spec.related.map((item) => ({ ...item, description: "A nearby page that helps finish this comparison." })),
    ...spokes.filter((item) => !spec.related.some((row) => row.href === item.href)),
  ].slice(0, 4);
  const cashRows = years.map((row, index) => {
    const cash = row.rent + row.cam - row.credit;
    const pv = cash / (1 + spec.rate) ** (index + 1);
    return [
      `Year ${index + 1}`,
      money(row.rent),
      money(row.cam),
      money(row.credit),
      money(cash),
      money(pv),
    ];
  });
  cashRows.push(["Sample NPV", "—", "—", "—", "—", money(npvA)]);
  const body = `
        ${photoHero(spec, questionId)}
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define">
          <div className="vg-container pv-reading">
            <h2>Plain-language definition</h2>
            ${paras(spec.definition)}
            ${callout("KEY_TAKEAWAY", "Key takeaway", spec.directAnswer)}
          </div>
        </section>
        <section className="pv-section pv-section-visual" data-section-type="EXPLANATION" data-section-id="why">
          <figure className="pv-section-visual-media">
            <img src="/media/hero-interior.webp" alt="Empty conference room used as editorial background. Not a customer photo." width={1600} height={900} loading="lazy" decoding="async" />
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
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            ${list(spec.how)}
            <figure className="pv-edu-figure" data-visualization="CASH_FLOW_TIMELINE">
              <img src="/media/viz-cash-flow.svg" alt="Later cash boxes sit farther right and look smaller than year-one cash." width={720} height={220} loading="lazy" decoding="async" />
              <figcaption>Later cash is smaller in today's dollars. This is a teaching picture, not a live model.</figcaption>
            </figure>
            <p>Formula in words. ${spec.formula}</p>
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
                <p>${years[0]?.note ?? "Year one still carries the credit."} If one path wins only because a credit sat in the wrong year, start over.</p>
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
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta=${JSON.stringify(spec.finalCta.label)}>
          <div className="vg-container pv-reading">
            <div className="pv-cta-panel">
              <h2>Next step</h2>
              <p>This site is a validation / pilot concept. It is not generally available. Payment is not collected.</p>
              <p><PrimaryCTA href=${JSON.stringify(spec.finalCta.href)}>${spec.finalCta.label}</PrimaryCTA></p>
            </div>
            ${
              spokes.length
                ? `<p className="pv-spoke-index">${spokes.map((item) => `<a href=${JSON.stringify(item.href)}>${item.label}</a>`).join(" · ")}</p>`
                : ""
            }
            <div className="pv-related-editorial">
            <RelatedContent items={${JSON.stringify(related)}} />
            </div>
            <section className="pv-source-board" data-section-type="AUTHORITY_REFERENCES">
              <h2>Trusted sources</h2>
              <p>These are public references. They are not endorsements and not client results.</p>
              <AuthorityRefs items={${JSON.stringify(spec.sources.map((item) => ({ href: item.href, label: item.label })))}} />
            </section>
            <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure>
          </div>
        </section>`;
  const source = innerPageShell({ page, importDepth: importDepth(spec.route), body });
  return source.replace(/<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/, breadcrumbs(spec));
}
