import { describe, expect, it } from "vitest";
import {
  clubThrottleHomeCanonical,
  clubThrottleJournalArticleCanonical,
  clubThrottleJournalIndexCanonical,
  evaluateArticleCanonicalQc,
  evaluateArticleRouteIdentityQc,
  evaluateArticleSchemaQc,
  evaluateClubThrottleComposedArticlePublicationQc,
  clubThrottleJournalArticleMetadata,
  clubThrottleJournalArticleSchemaGraph,
} from "../club-throttle-journal-publication-metadata";
import {
  CLUB_THROTTLE_JOURNAL_POSTS,
  clubThrottleJournalDrafts,
  composeClubThrottleJournalFiles,
} from "../club-throttle-journal";
import { evaluateVentureIsolationGate } from "@/lib/infinity/venture-isolation/venture-isolation";

function draftBySlug(slug: string) {
  const draft = clubThrottleJournalDrafts().find((row) => row.canonical.includes(slug));
  if (!draft) throw new Error(`missing draft ${slug}`);
  return draft;
}

function postBySlug(slug: string) {
  const post = CLUB_THROTTLE_JOURNAL_POSTS.find((row) => row.slug === slug);
  if (!post) throw new Error(`missing post ${slug}`);
  return post;
}

function parseComposedCanonical(pageSource: string): string {
  const match = pageSource.match(/"alternates"\s*:\s*\{\s*"canonical"\s*:\s*"([^"]+)"/);
  return match?.[1] ?? "";
}

describe("Club Throttle journal publication metadata", () => {
  it("fails when an article canonical resolves to the homepage", () => {
    const draft = draftBySlug("how-riders-choose-a-shirt");
    const gate = evaluateArticleCanonicalQc({
      expected_path: draft.canonical,
      declared_canonical: clubThrottleHomeCanonical(),
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons).toContain("homepage_canonical_on_article");
  });

  it("passes shirt and night-ride article canonicals with distinct URLs", () => {
    const shirt = draftBySlug("how-riders-choose-a-shirt");
    const night = draftBySlug("how-to-ride-after-dark");
    const shirtCanonical = clubThrottleJournalArticleCanonical(shirt.canonical);
    const nightCanonical = clubThrottleJournalArticleCanonical(night.canonical);
    expect(shirtCanonical).toBe("https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/");
    expect(nightCanonical).toBe("https://clubthrottle.com/journal/night-riding/how-to-ride-after-dark/");
    expect(shirtCanonical).not.toBe(nightCanonical);
    expect(evaluateArticleCanonicalQc({ expected_path: shirt.canonical, declared_canonical: shirtCanonical }).result).toBe("PASS");
    expect(evaluateArticleCanonicalQc({ expected_path: night.canonical, declared_canonical: nightCanonical }).result).toBe("PASS");
  });

  it("passes homepage and journal index canonicals without collision", () => {
    expect(clubThrottleHomeCanonical()).toBe("https://clubthrottle.com/");
    expect(clubThrottleJournalIndexCanonical()).toBe("https://clubthrottle.com/journal/");
    expect(clubThrottleHomeCanonical()).not.toBe(clubThrottleJournalIndexCanonical());
  });

  it("fails route identity when slug or venture contamination is wrong", () => {
    const draft = draftBySlug("how-riders-choose-a-shirt");
    expect(
      evaluateArticleRouteIdentityQc({
        draft,
        declared_canonical: "https://clubthrottle.com/journal/apparel/wrong-slug/",
      }).result,
    ).toBe("FAIL");
    const contaminated = evaluateVentureIsolationGate({
      venture_id: "club-throttle",
      html_or_text: "occupancynpv tenant lease npv",
    });
    expect(contaminated.result).toBe("FAIL");
  });

  it("passes composed shirt article metadata and schema stack", () => {
    const slug = "how-riders-choose-a-shirt";
    const draft = draftBySlug(slug);
    const post = postBySlug(slug);
    const files = composeClubThrottleJournalFiles();
    const page = files.find((file) => file.path.includes(slug))?.content ?? "";
    const declared = parseComposedCanonical(page);
    const metadata = clubThrottleJournalArticleMetadata(draft);
    expect(declared).toBe(metadata.alternates.canonical);
    const graph = clubThrottleJournalArticleSchemaGraph({ draft, post });
    const qc = evaluateClubThrottleComposedArticlePublicationQc({
      draft,
      post,
      declared_canonical: declared,
      schema_graph: graph,
    });
    expect(qc.canonical.result).toBe("PASS");
    expect(qc.route.result).toBe("PASS");
    expect(qc.schema.result).toBe("PASS");
    expect(evaluateArticleSchemaQc(draft).result).toBe("PASS");
  });

  it("passes a second composed article with its own canonical", () => {
    const slug = "how-to-ride-after-dark";
    const draft = draftBySlug(slug);
    const post = postBySlug(slug);
    const page = composeClubThrottleJournalFiles().find((file) => file.path.includes(slug))?.content ?? "";
    const declared = parseComposedCanonical(page);
    expect(evaluateArticleCanonicalQc({ expected_path: draft.canonical, declared_canonical: declared }).result).toBe("PASS");
    expect(evaluateClubThrottleComposedArticlePublicationQc({
      draft,
      post,
      declared_canonical: declared,
      schema_graph: clubThrottleJournalArticleSchemaGraph({ draft, post }),
    }).schema.result).toBe("PASS");
  });
});
