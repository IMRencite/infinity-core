export type ArticleSection = { heading: string; paragraphs: string[] };

function stripMarkdownHeading(block: string): string {
  return block.replace(/^#{1,3}\s+/, "").replace(/\\n/g, "\n").trim();
}

function splitParagraphs(body: string): string[] {
  return body
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .split(/\n\n+/)
    .map((row) => stripMarkdownHeading(row))
    .filter((row) => row && !/^#{1,3}\s/.test(row));
}

export function pairHeadingsToParagraphs(headings: string[], body: string): ArticleSection[] {
  const markdown = body.split(/^##\s+/m);
  if (markdown.length > 1) {
    const intro = markdown[0]?.trim();
    const sections = markdown.slice(1).map((chunk) => {
      const [title, ...rest] = chunk.split(/\n/);
      return {
        heading: (title ?? "").trim(),
        paragraphs: rest.join("\n").split(/\n\n+/).map((row) => stripMarkdownHeading(row)).filter(Boolean),
      };
    }).filter((row) => row.heading);
    if (intro && sections[0]) sections[0].paragraphs.unshift(...splitParagraphs(intro));
    return sections.filter((row) => row.paragraphs.length);
  }

  const paras = splitParagraphs(body);
  if (!headings.length) return [{ heading: "", paragraphs: paras }];
  const n = headings.length;
  const base = Math.max(1, Math.floor(paras.length / n));
  const extra = paras.length - base * n;
  let cursor = 0;
  return headings.map((heading, index) => {
    const take = index === n - 1 ? paras.length - cursor : base + (index < extra ? 1 : 0);
    const slice = paras.slice(cursor, cursor + Math.max(take, 1));
    cursor += slice.length;
    return { heading, paragraphs: slice.length ? slice : paras.slice(-1) };
  });
}

export function renderCanonicalArticleMain(input: {
  headings: string[];
  body: string;
  faqs?: Array<{ question: string; answer: string }>;
  info_visual_html?: string;
}): string {
  const sections = pairHeadingsToParagraphs(input.headings, input.body);
  const main = sections
    .map((section, index) => {
      const paras = section.paragraphs.map((row) => `<p>${row.replace(/`/g, "")}</p>`).join("\n            ");
      if (!section.heading) return paras;
      const speakableId =
        index === 0 ? ' id="summary"' : index === sections.length - 1 ? ' id="key-takeaways"' : "";
      return `<h2${speakableId}>${section.heading}</h2>\n            ${paras}`;
    })
    .join("\n            ");
  const faqs = (input.faqs ?? [])
    .map((row) => `<h3>${row.question}</h3>\n            <p>${row.answer}</p>`)
    .join("\n            ");
  const infoVisual = input.info_visual_html?.trim() ? `\n            ${input.info_visual_html.trim()}` : "";
  return `${main}${infoVisual}${faqs ? `\n            ${faqs}` : ""}`;
}

export function articleMainHasLeaks(html: string): boolean {
  const visible = html.replace(/<[^>]+>/g, " ");
  return /\\n/.test(html) || /(^|\s)##\s+\S/.test(visible);
}
