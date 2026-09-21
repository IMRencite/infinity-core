import { describe, expect, it } from "vitest";
import { reconstructCreVisualHomepageFoldSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-homepage-fold-successor";
import { reconstructCreVisualTableDesignSuccessor } from "@/lib/infinity/venture-website-architecture/cre-visual-table-design-successor";
import { pageContent } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import {
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST,
} from "../constants";
import {
  getCanonicalActivePublicValidationState,
  isVisualHomepageFoldSuccessorPublicActive,
} from "../active-public-artifact";
import { isCreValidationArtifactId } from "../current-cre-artifact";
import {
  VISUAL_HOMEPAGE_FOLD_FOUNDER_AUTHORIZATION_ID,
  evaluateVisualHomepageFoldFounderAuthorization,
} from "../cre-visual-homepage-fold-authorization";

describe("CRE visual homepage fold successor v1 freeze", () => {
  it("locks fold identity without mutating the table-design predecessor", async () => {
    const predecessor = await reconstructCreVisualTableDesignSuccessor();
    const successor = await reconstructCreVisualHomepageFoldSuccessor();
    expect(predecessor.artifactId).toBe(SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID);
    expect(predecessor.digest).toBe(SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.artifactId).toBe(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID);
    expect(successor.digest).toBe(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_SOURCE_DIGEST);
    expect(successor.digest).toBe("3c1840108487827233e48c2f12011f0fa7b3922a606f1e5191119cff28a1275c");
    expect(successor.founderVisualReviewReady).toBe("FOUNDER_VISUAL_REVIEW_READY");
    expect(successor.footer.overall).toBe("PASS");
    expect(successor.liveArtifactMutated).toBe(false);
    expect(isCreValidationArtifactId(successor.artifactId)).toBe(true);
    expect(evaluateVisualHomepageFoldFounderAuthorization().authorization?.authorizationId).toBe(
      VISUAL_HOMEPAGE_FOLD_FOUNDER_AUTHORIZATION_ID,
    );
  }, 180000);

  it("puts hero actions on the photo and insets the close questions", async () => {
    const successor = await reconstructCreVisualHomepageFoldSuccessor();
    const home = pageContent(successor.files, "/");
    expect(home).toContain("pv-hero-photo");
    expect(home).toContain("pv-hero-photo--compact");
    expect(home).toContain("pv-hero-actions-row");
    expect(home).toContain("Compare two leases");
    expect(home).toContain("See the workflow");
    expect(home).toContain("pv-close-well");
    expect(home).toMatch(/pv-close-well[\s\S]*Who is this not for/);
    expect(DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID).toBe("dpl_5TCnCweZNfTp3ZDAQoEcoyZv6Npg");
    expect(DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL).toBe(
      "https://infinity-validation-cre-lease-npv-e72beb7b-ekunq3zvj.vercel.app",
    );
    expect(getCanonicalActivePublicValidationState().activeArtifactId).not.toBe(
      SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
    );
    expect(isVisualHomepageFoldSuccessorPublicActive()).toBe(false);
  }, 180000);
});
