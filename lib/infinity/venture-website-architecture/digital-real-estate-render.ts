import { innerPageShell } from "./page-sources";
import { hubLabel, plannedHubPage, plannedQuestionPage, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { extendYears, narrateYears, type AuthorityPageSpec } from "./digital-real-estate-content";
import { canonicalQuestionId } from "./answer-authority/question-system";
import type { PlannedPage } from "./types";

function p(text: string): string {
  return `<p>${text}</p>`;
}

function paras(items: string[]): string {
  return items.map(p).join("\n            ");
}

function callout(kind: string, title: string, body: string): string {
  return `<aside className="pv-callout" data-callout=${JSON.stringify(kind)}><h3>${title}</h3>${p(body)}</aside>`;
}

function table(caption: string, headers: string[], rows: string[][], viz: string): string {
  const head = headers.map((item) => `<th scope="col">${item}</th>`).join("");
  const body = rows
    .map((row, index) => `<tr>${row.map((cell, cellIndex) => (cellIndex === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join("")}</tr>`)
    .join("");
  return `<div className="pv-data-panel" data-visualization=${JSON.stringify(viz)}><table className="pv-compare"><caption className="pv-caption">${caption}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
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

export function renderAuthorityPage(spec: AuthorityPageSpec): string {
  const page = plannedFor(spec);
  const questionId = canonicalQuestionId(spec.question);
  const yearLines = narrateYears(spec.exampleName, spec.years, spec.rate);
  const inputRows = spec.inputs.map(([name, meaning]) => [name, meaning]);
  const spokes = SEO_GEO_QUESTION_PAGES.filter((item) => item.hub === spec.route).map((item) => ({
    href: item.route,
    label: item.question,
  }));
  const related = [...spec.related, ...spokes.filter((item) => !spec.related.some((row) => row.href === item.href))];
  const body = `
        <header className="pv-hero pv-article-hero pv-hero-authority" data-section-type="HERO" data-section-id="hero" data-pattern-id="FOCUSED_HERO">
          <div className="vg-container pv-prose">
            <p className="pv-eyebrow">${page.topicCluster.replace(/-/g, " ")}</p>
            <h1 className="pv-display">${spec.question}</h1>
            <div data-question-id=${JSON.stringify(questionId)} data-answer-chunk-id=${JSON.stringify(`${questionId}_chunk`)}>
              <AnswerFirst question=${JSON.stringify(spec.question)} answer=${JSON.stringify(spec.directAnswer)} />
            </div>
            <p><PrimaryCTA href=${JSON.stringify(spec.cta.href)}>${spec.cta.label}</PrimaryCTA></p>
          </div>
        </header>
        <section className="pv-section" data-section-type="DEFINITION" data-section-id="define">
          <div className="vg-container pv-prose">
            <h2>Plain-language definition</h2>
            ${paras(spec.definition)}
            ${callout("KEY_TAKEAWAY", "Key takeaway", spec.directAnswer)}
          </div>
        </section>
        <section className="pv-section pv-section-tint" data-section-type="EXPLANATION" data-section-id="why">
          <div className="vg-container pv-prose">
            <h2>Why it matters</h2>
            ${paras(spec.why)}
          </div>
        </section>
        <section className="pv-section" data-section-type="HOW_IT_WORKS" data-section-id="how">
          <div className="vg-container pv-prose">
            <h2>How it works</h2>
            <p>The cash flow is the list of money in and out by year. Write that list first.</p>
            ${paras(spec.how)}
            <div className="pv-formula" data-visualization="FORMULA_BOX"><p>Formula in words. ${spec.formula}</p></div>
            ${table("Required inputs for this page", ["Input", "Meaning"], inputRows, "ASSUMPTION_TABLE")}
          </div>
        </section>
        <section className="pv-section pv-section-tint" data-section-type="EXAMPLE" data-section-id="example">
          <div className="vg-container pv-prose">
            <h2>Worked example</h2>
            <p>This is a teaching sample. It is not customer data and not a result from a live client.</p>
            ${paras(yearLines)}
            ${table(
              `ILLUSTRATIVE EXAMPLE — ${spec.exampleName}`,
              ["Year", "Rent", "Extras", "Credit"],
              extendYears(spec.years).map((row, index) => [
                `Year ${index + 1}`,
                `$${row.rent.toLocaleString("en-US")}`,
                `$${row.cam.toLocaleString("en-US")}`,
                `$${row.credit.toLocaleString("en-US")}`,
              ]),
              "CASH_FLOW_TIMELINE",
            )}
            ${callout("EXAMPLE", "Example", `The sample walk for ${spec.exampleName} is here so you can see the cash move. It is not a promise.`)}
            <h3>Look at a second sample</h3>
            <p>Fair compares need a second path. Call it the other option.</p>
            ${paras(
              narrateYears(
                "the other option",
                extendYears(spec.years).map((row) => ({
                  rent: Math.round(row.rent * 0.93),
                  cam: Math.round(row.cam * 1.07),
                  credit: Math.round(row.credit * 0.55),
                  note: "This other option trades a lower face rent for heavier extras.",
                })),
                spec.rate,
              ),
            )}
            <p>Both samples use the same discount rate. That is what makes the pair fair.</p>
            <p>If one path wins only because a credit sat in the wrong year, start over.</p>
            <p>If the two totals are close, do not pretend the math found a sure winner.</p>
            <p><PrimaryCTA href=${JSON.stringify(spec.midCta.href)}>${spec.midCta.label}</PrimaryCTA></p>
          </div>
        </section>
        <section className="pv-section" data-section-type="ASSUMPTIONS" data-section-id="assumptions">
          <div className="vg-container pv-prose">
            <h2>Assumptions</h2>
            ${paras(spec.assumptions)}
            ${callout("WHAT_CHANGES", "What changes the result", spec.assumptions[0] ?? "A missing extra or a hidden rate can move the rank.")}
          </div>
        </section>
        <section className="pv-section pv-section-tint" data-section-type="EDGE_CASES" data-section-id="edges">
          <div className="vg-container pv-prose">
            <h2>Edge cases</h2>
            ${paras(spec.edges)}
          </div>
        </section>
        <section className="pv-section" data-section-type="MISTAKES" data-section-id="mistakes">
          <div className="vg-container pv-prose">
            <h2>Common mistakes</h2>
            ${paras(spec.mistakes)}
            ${callout("COMMON_MISTAKE", "Common mistake", spec.mistakes[0] ?? "Leaving an extra off the list.")}
          </div>
        </section>
        <section className="pv-section pv-section-tint" data-section-type="DECISION" data-section-id="decide">
          <div className="vg-container pv-prose">
            <h2>Decision implications</h2>
            ${paras(spec.decisions)}
            <h2>Compare this to related metrics</h2>
            ${paras(spec.compare)}
            ${spec.personaNote ? callout(spec.personaNote.title.toUpperCase().includes("FINANCE") ? "FOR_FINANCE" : "FOR_BROKERS", spec.personaNote.title, spec.personaNote.body) : ""}
          </div>
        </section>
        <section className="pv-section" data-section-type="LIMITS" data-section-id="limits">
          <div className="vg-container pv-prose">
            <h2>Limits</h2>
            ${paras(spec.limits)}
            <h2>When this should not drive the choice</h2>
            ${paras(spec.whenNot)}
          </div>
        </section>
        <section className="pv-section pv-cta-band" data-section-type="CTA" data-section-id="final" data-cta=${JSON.stringify(spec.finalCta.label)}>
          <div className="vg-container pv-prose">
            <h2>Next step</h2>
            <p>This site is a validation / pilot concept. It is not generally available. Payment is not collected.</p>
            <p><PrimaryCTA href=${JSON.stringify(spec.finalCta.href)}>${spec.finalCta.label}</PrimaryCTA></p>
            <h2>Related questions</h2>
            <RelatedContent items={${JSON.stringify(related)}} />
            <h2>Trusted references</h2>
            <AuthorityRefs items={${JSON.stringify(spec.sources.map((item) => ({ href: item.href, label: item.label })))}} />
            <Disclosure>Calculations on this page are informational. They are not legal advice and not investment advice. Lease terms should be independently verified.</Disclosure>
          </div>
        </section>`;
  const source = innerPageShell({ page, importDepth: importDepth(spec.route), body });
  return source.replace(/<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/, breadcrumbs(spec));
}
