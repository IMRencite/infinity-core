import { describe, expect, it } from "vitest";
import { reconstructCreVisualTableDesignSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-table-design-successor";
import { reconstructCreVisualPolishSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-polish-successor";
import { evaluateVisibleFooterGutter } from "@/lib/infinity/venture-website-architecture/visual-quality-gates";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import {
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  isVisualTableDesignSuccessorPublicActive,
  tableDesignSuccessorActivationMutationsConsumed,
} from "../active-public-artifact";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import {
  VISUAL_TABLE_DESIGN_FOUNDER_AUTHORIZATION_ID,
  evaluateVisualTableDesignFounderAuthorization,
} from "../cre-visual-table-design-authorization";

describe("CRE visual table design successor v1 freeze", () => {
  it("locks table-design identity without mutating the polish predecessor", async () => {
    const predecessor = await reconstructCreVisualPolishSuccessor();
    const successor = await reconstructCreVisualTableDesignSuccessor();
    expect(predecessor.artifactId).toBe(SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(predecessor.digest).toBe(SEO_GEO_VISUAL_POLISH_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("11ef0fe0d6a770feeeab83d8226085089f671b8d25651d93ec97eae986ff9c0d");
    expect(successor.predecessorArtifactId).toBe(SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID);
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.visual.tables.overall).toBe("PASS");
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(evaluateVisualTableDesignFounderAuthorization().authorization?.authorizationId).toBe(
      VISUAL_TABLE_DESIGN_FOUNDER_AUTHORIZATION_ID,
    );
  }, 180000);

  it("turns homepage worked-example tables into a designed ledger", async () => {
    const successor = await reconstructCreVisualTableDesignSuccessor();
    const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
    const home = pageContent(successor.files, "/");
    const footer = evaluateVisibleFooterGutter(css);
    expect(footer.overall).toBe("PASS");
    expect(home).toContain("pv-worked-ledger");
    expect(home).toContain("pv-table-designed");
    expect(home).toContain("pv-fin-table");
    expect(home).toContain("pv-cell-note");
    expect(home).toContain("pv-decision-takeaway");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain(".pv-compare thead th");
    expect(home).not.toContain("$32,400 after free rent and TI");
    expect(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_A5wSKzhESxDc9LsPn488DRfPyzNV");
    expect(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-qkhlts7nc.vercel.app",
    );
    expect(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_A5wSKzhESxDc9LsPn488DRfPyzNV");
    expect(isVisualTableDesignSuccessorPublicActive()).toBe(false);
    expect(tableDesignSuccessorActivationMutationsConsumed()).toBe(1);
  }, 180000);
});
