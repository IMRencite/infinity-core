import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS,
  evaluateDeploymentVerificationState,
  evaluateLiveDeploymentParityGate,
  liveFeatureStatus,
} from "@/lib/infinity/organic-growth-engine/continuous/live-deployment-parity";
import { waitForCanonicalPropagation } from "../deployment-verification";

describe("DEPLOYMENT_VERIFICATION_STATE", () => {
  it("does not convert a first stale canonical fetch into FAIL while the artifact is correct", () => {
    const first = evaluateDeploymentVerificationState({
      deployed: true,
      aliased: true,
      deploymentUrl: "https://infinity-validation-cre-lease-npv-e72beb7b-egv49lf5d.vercel.app",
      canonicalUrl: "https://occupancynpv.com/blog/tag/interest-rates/",
      deploymentArtifactCorrect: true,
      canonicalServesNewArtifact: false,
      elapsedMs: 0,
    });
    expect(first.lifecycle).toBe("PROPAGATING");
    expect(first.result).toBe("PROPAGATING");
    expect(first.hosts_differ).toBe(true);
    expect(first.reasons).toContain("FIRST_CANONICAL_FETCH_STALE_NOT_FAIL");
    expect(first.result).not.toBe("FAIL");
  });

  it("passes once the canonical alias serves the new artifact", () => {
    expect(evaluateDeploymentVerificationState({
      deployed: true,
      aliased: true,
      deploymentUrl: "https://preview.example.vercel.app",
      canonicalUrl: "https://occupancynpv.com/blog/",
      deploymentArtifactCorrect: true,
      canonicalServesNewArtifact: true,
      elapsedMs: 4_000,
    })).toMatchObject({
      lifecycle: "LIVE_VERIFIED",
      result: "PASS",
    });
  });

  it("fails only after the bounded window if canonical is still stale", () => {
    expect(evaluateDeploymentVerificationState({
      deployed: true,
      aliased: true,
      deploymentUrl: "https://preview.example.vercel.app",
      canonicalUrl: "https://occupancynpv.com/blog/",
      deploymentArtifactCorrect: true,
      canonicalServesNewArtifact: false,
      elapsedMs: DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS,
    })).toMatchObject({
      result: "FAIL",
      reasons: ["CANONICAL_STILL_STALE_AFTER_WINDOW"],
    });
  });

  it("fails immediately when the deployment artifact itself is wrong", () => {
    expect(evaluateDeploymentVerificationState({
      deployed: true,
      aliased: true,
      deploymentUrl: "https://preview.example.vercel.app",
      canonicalUrl: "https://occupancynpv.com/blog/",
      deploymentArtifactCorrect: false,
      canonicalServesNewArtifact: false,
      elapsedMs: 0,
    }).result).toBe("FAIL");
  });

  it("retries inside the window and does not mark a transient race as FAIL", async () => {
    let canonical = false;
    const verification = await waitForCanonicalPropagation({
      deployed: true,
      aliased: true,
      deploymentUrl: "https://preview.example.vercel.app",
      canonicalUrl: "https://occupancynpv.com/blog/",
      windowMs: 40,
      pollMs: 10,
      sleep: async () => undefined,
      now: (() => {
        let t = 0;
        return () => {
          t += 10;
          return t;
        };
      })(),
      inspectDeployment: async () => true,
      inspectCanonical: async () => {
        if (canonical) return true;
        canonical = true;
        return false;
      },
    });
    expect(verification.result).toBe("PASS");
    expect(verification.lifecycle).toBe("LIVE_VERIFIED");
    expect(verification.attempts).toBeGreaterThan(1);
    expect(verification.result).not.toBe("FAIL");
  });

  it("does not fail LiveDeploymentParityGate on a propagating canonical race", () => {
    const parity = evaluateLiveDeploymentParityGate({
      implemented: true,
      productionArtifactIncludesChanges: true,
      deploymentCompleted: true,
      canonicalDomainServesNewVersion: false,
      liveHtmlMatches: false,
      noStaleAlias: true,
      cdnNotStale: false,
      deploymentArtifactCorrect: true,
      propagationElapsedMs: 8_000,
    });
    expect(parity.result).toBe("PASS");
    expect(parity.reasons).toContain("FIRST_CANONICAL_FETCH_STALE_NOT_FAIL");
  });

  it("keeps compose-only work from counting as live PASS", () => {
    expect(evaluateLiveDeploymentParityGate({
      implemented: true,
      productionArtifactIncludesChanges: true,
      deploymentCompleted: false,
      canonicalDomainServesNewVersion: false,
      liveHtmlMatches: false,
      noStaleAlias: false,
      cdnNotStale: false,
    }).result).toBe("FAIL");
    expect(liveFeatureStatus({
      implemented: true,
      deployed: true,
      liveVerified: false,
      propagating: true,
    })).toMatchObject({
      live_verified: "PROPAGATING",
      production: "NOT_PROVEN",
    });
  });
});
