import type { CompositionPattern, SectionCompositionProfile } from "./types";

const PATTERN_MARKERS: Array<{ pattern: CompositionPattern; test: RegExp }> = [
  { pattern: "editorial-split", test: /pv-editorial-split|pv-hero--split|pv-hero-grid/ },
  { pattern: "visual-left-text-right", test: /visual-left-text-right|pv-hero--split/ },
  { pattern: "text-left-visual-right", test: /text-left-visual-right|pv-hero-grid/ },
  { pattern: "full-width-data-story", test: /pv-data-panel|data-visualization="NPV/ },
  { pattern: "comparison-matrix", test: /pv-compare|pv-comparison-band|LEASE_OPTION_COMPARISON/ },
  { pattern: "timeline", test: /CASH_FLOW_TIMELINE|data-visualization="TIMELINE"/ },
  { pattern: "workflow", test: /pv-workflow|WORKFLOW_DIAGRAM/ },
  { pattern: "worked-example", test: /pv-worked-example|ILLUSTRATIVE EXAMPLE/ },
  { pattern: "question-cluster", test: /pv-question-cluster|data-answer-first/ },
  { pattern: "callout-band", test: /pv-callout-band|pv-key-takeaway/ },
  { pattern: "faq", test: /data-section-type="FAQ"/ },
  { pattern: "cta-band", test: /pv-cta-band|data-section-type="CTA"/ },
  { pattern: "source-block", test: /pv-source-block|AuthorityRefs/ },
  { pattern: "topic-map", test: /RelatedContent|topic map|resources hub/i },
  { pattern: "product-ui", test: /ProductUiFrame|pv-product-frame/ },
  { pattern: "data-visualization", test: /data-visualization/ },
];

export function headingParagraphRun(html: string): number {
  const blocks = [...html.matchAll(/<h2\b[\s\S]*?<\/h2>\s*<p\b/g)];
  if (blocks.length === 0) return 0;
  let longest = 1;
  let current = 1;
  let lastIndex = blocks[0].index ?? 0;
  for (const match of blocks.slice(1)) {
    const index = match.index ?? 0;
    const between = html.slice(lastIndex, index);
    const interrupted =
      /pv-question-cluster|pv-editorial-split|pv-worked-example|pv-comparison-band|pv-callout-band|pv-workflow|ProductUiFrame|pv-data-panel|pv-cta-band/.test(
        between,
      );
    if (index - lastIndex < 900 && !interrupted) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
    lastIndex = index;
  }
  return Math.max(longest, blocks.length >= 6 && longest < 6 ? Math.min(blocks.length, 8) : longest);
}

export function inspectSectionComposition(html: string): SectionCompositionProfile {
  const patterns = PATTERN_MARKERS.filter((item) => item.test.test(html)).map((item) => item.pattern);
  const run = headingParagraphRun(html);
  const pairCount = (html.match(/<h2\b[\s\S]*?<\/h2>\s*<p\b/g) ?? []).length;
  const designedModules = (html.match(/data-composition=/g) ?? []).length;
  const designed =
    /pv-question-cluster|pv-editorial-split|pv-worked-example|pv-comparison-band|pv-callout-band|pv-pricing-split|pv-hero--split/.test(
      html,
    );
  const monotonous = pairCount >= 5 && designedModules < 2 && !designed;
  const underDesigned = monotonous ? Math.max(1, Math.floor(pairCount / 3)) : 0;
  const hierarchyWeak = monotonous;
  const overall = monotonous || hierarchyWeak ? "FAIL" : "PASS";
  return {
    model: "SectionCompositionProfile",
    patterns,
    headingParagraphRun: run,
    monotonousLongForm: monotonous,
    underDesignedSections: underDesigned,
    visualHierarchyWeak: hierarchyWeak,
    overall,
  };
}

export function applyLongFormCompositionRepair(source: string): string {
  if (source.includes("data-composition-repaired=\"true\"")) return source;
  let next = source.replace(
    /<div className="pv-data-panel"([^>]*)>(\s*<table)/g,
    '<div className="pv-table-wrap"><div className="pv-data-panel"$1>$2',
  );
  if (next.includes("pv-table-wrap")) {
    next = closeTableWraps(next);
  }
  next = next
    .replace(
      'className="pv-section" data-section-type="EXPLANATION" data-section-id="scaffold_why"',
      'className="pv-section pv-question-cluster" data-section-type="EXPLANATION" data-section-id="scaffold_why" data-composition="question-cluster"',
    )
    .replace(
      'className="pv-section" data-section-type="EXAMPLE" data-section-id="scaffold_example"',
      'className="pv-section pv-worked-example" data-section-type="EXAMPLE" data-section-id="scaffold_example" data-composition="worked-example"',
    )
    .replace(
      'className="pv-section" data-section-type="DEPTH" data-section-id="scaffold_depth"',
      'className="pv-section pv-callout-band" data-section-type="DEPTH" data-section-id="scaffold_depth" data-composition="callout-band"',
    );
  next = wrapHeadingParagraphClusters(next);
  next = wrapWorkedExamples(next);
  next = wrapAuthority(next);
  if (!next.includes("data-composition-repaired")) {
    next = `/* data-composition-repaired="true" */\n${next}`;
  }
  return next;
}

function closeTableWraps(source: string): string {
  return source.replace(
    /<div className="pv-table-wrap"><div className="pv-data-panel"([\s\S]*?)<\/table>\s*<\/div>/g,
    '<div className="pv-table-wrap"><div className="pv-data-panel"$1</table></div></div>',
  );
}

function wrapHeadingParagraphClusters(source: string): string {
  const proseBlocks = [...source.matchAll(/<div className="vg-container pv-prose">([\s\S]*?)<\/div>/g)];
  let next = source;
  for (const block of proseBlocks) {
    const inner = block[1];
    if (/pv-question-cluster/.test(inner)) continue;
    const pairs = [...inner.matchAll(/<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>/g)];
    if (pairs.length < 3) continue;
    const first = pairs[0][0];
    const third = pairs[Math.min(2, pairs.length - 1)][0];
    const start = inner.indexOf(first);
    const end = inner.indexOf(third) + third.length;
    if (start < 0 || end <= start) continue;
    const cluster = inner.slice(start, end);
    if (/pv-workflow|ProductUiFrame|pv-data-panel/.test(cluster)) continue;
    const wrapped = `<div className="pv-question-cluster" data-composition="question-cluster">${cluster}</div>`;
    const replacedInner = inner.slice(0, start) + wrapped + inner.slice(end);
    next = next.replace(block[0], `<div className="vg-container pv-prose">${replacedInner}</div>`);
  }
  return next;
}

function wrapWorkedExamples(source: string): string {
  return source.replace(
    /(<h2>Worked example[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>\s*)((?:\s*<div className="pv-table-wrap">[\s\S]*?<\/div>\s*)+)/g,
    '<div className="pv-worked-example" data-composition="worked-example">$1$2</div>',
  );
}

function wrapAuthority(source: string): string {
  return source.replace(
    /<AuthorityRefs /g,
    '<div className="pv-source-block" data-composition="source-block"><AuthorityRefs ',
  ).replace(
    /<AuthorityRefs([\s\S]*?)\/>/g,
    "<AuthorityRefs$1/></div>",
  );
}

export function applyHowItWorksComposition(source: string): string {
  let next = source;
  next = next.replace(
    /<h2>The problem the current method creates<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>Broker inputs and lease inputs<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-question-cluster" data-composition="question-cluster">
            <article className="pv-surface"><h2>The problem the current method creates</h2><p>$1</p></article>
            <article className="pv-surface"><h2>Broker inputs and lease inputs</h2><p>$2</p></article>
          </div>`,
  );
  next = next.replace(
    /<h2>Term normalization and cash-flow generation<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>TI, free rent, CAM, and escalations<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-editorial-split" data-composition="editorial-split">
            <div>
              <h2>Term normalization and cash-flow generation</h2>
              <p>$1</p>
              <h2>TI, free rent, CAM, and escalations</h2>
              <p>$2</p>
            </div>
            <div className="pv-key-takeaway"><p>Tenant improvement allowance is a timed cash event, not a brochure number. Free rent changes year-one occupancy cost and the later step-up base.</p></div>
          </div>`,
  );
  next = next.replace(
    /<h2>What the proposed product does<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>What it does not do<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-comparison-band" data-composition="comparison-matrix">
            <h2>What the proposed product does</h2>
            <p>$1</p>
            <h2>What it does not do</h2>
            <p>$2</p>
          </div>`,
  );
  next = next.replace(
    /<h2>Limitations and objections<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-callout-band" data-composition="callout-band"><h2>Limitations and objections</h2><p>$1</p></div>`,
  );
  return applyLongFormCompositionRepair(next);
}

export function applyFreeRentComposition(source: string): string {
  let next = source;
  next = next.replace(
    /<h2>What is free rent in a commercial lease\?<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>How is free rent structured\?<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>Why does the timing of free rent matter\?<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-question-cluster" data-composition="question-cluster">
            <article className="pv-surface"><h2>What is free rent in a commercial lease?</h2><p>$1</p></article>
            <article className="pv-surface"><h2>How is free rent structured?</h2><p>$2</p></article>
            <article className="pv-surface"><h2>Why does the timing of free rent matter?</h2><p>$3</p></article>
          </div>`,
  );
  next = next.replace(
    /<h2>Free rent versus lower face rent<\/h2>\s*<p>([\s\S]*?)<\/p>\s*<h2>How should brokers model free rent\?<\/h2>\s*<p>([\s\S]*?)<\/p>/,
    `<div className="pv-comparison-band" data-composition="comparison-matrix">
            <h2>Free rent versus lower face rent</h2>
            <p>$1</p>
            <h2>How should brokers model free rent?</h2>
            <p>$2</p>
          </div>`,
  );
  next = next.replace(
    /<h2>Common mistakes<\/h2>\s*<ul>([\s\S]*?)<\/ul>/,
    `<div className="pv-callout-band" data-composition="callout-band"><h2>Common mistakes</h2><ul>$1</ul></div>`,
  );
  return applyLongFormCompositionRepair(next);
}

export function applyFooterInnerContainer(footerSource: string): string {
  if (footerSource.includes("vg-legal-footer-inner")) return footerSource;
  return footerSource.replace(
    `<div className="vg-container">`,
    `<div className="vg-container vg-legal-footer-inner">`,
  );
}
