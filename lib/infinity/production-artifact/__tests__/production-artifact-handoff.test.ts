import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeProductionContentHash,
  hashFileContent,
  isProhibitedProductionPath,
  assertNoSecretsInContent,
  type ProductionFileManifestEntry,
} from "@/lib/infinity/production-artifact/types";
import {
  validateFrameworkReadiness,
  validatePackageJsonContent,
} from "@/lib/infinity/production-artifact/framework-validators";
import {
  resolveApprovedRepositoryName,
  assertRepositoryNameMatchesApproval,
} from "@/lib/infinity/production-artifact/repository-naming";
import {
  normalizeVercelReadyState,
  pollWithBackoff,
  verifyLiveHttp,
} from "@/lib/infinity/production-artifact/deployment-lifecycle";
import {
  pushProductionArtifactToGithub,
  verifyGithubTreeAgainstManifest,
} from "@/lib/infinity/production-artifact/github-artifact-push";

describe("Production Artifact Handoff v1", () => {
  const sampleManifest: ProductionFileManifestEntry[] = [
    {
      relative_path: "package.json",
      content_hash: hashFileContent(
        '{"name":"x","scripts":{"build":"next build"},"dependencies":{"next":"15.0.0","react":"19.0.0","react-dom":"19.0.0"}}',
      ),
      byte_size: 40,
      file_mode: "100644",
    },
    {
      relative_path: "package-lock.json",
      content_hash: hashFileContent('{"lockfileVersion":3,"packages":{}}'),
      byte_size: 10,
      file_mode: "100644",
    },
    {
      relative_path: "app/page.tsx",
      content_hash: hashFileContent("export default function Page(){return null}"),
      byte_size: 38,
      file_mode: "100644",
    },
  ];

  it("produces stable content hash for identical manifest", () => {
    const a = computeProductionContentHash(sampleManifest);
    const b = computeProductionContentHash([...sampleManifest].reverse());
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects tampered manifest hash", () => {
    const hash = computeProductionContentHash(sampleManifest);
    const tampered = [...sampleManifest];
    tampered[0] = { ...tampered[0], byte_size: tampered[0].byte_size + 1 };
    expect(computeProductionContentHash(tampered)).not.toBe(hash);
  });

  it("excludes secret paths and content patterns", () => {
    expect(isProhibitedProductionPath(".env.local")).toBe(true);
    expect(isProhibitedProductionPath("node_modules/foo")).toBe(true);
    expect(isProhibitedProductionPath("app/page.tsx")).toBe(false);
    expect(() => assertNoSecretsInContent("token ghp_1234567890123456789012345678901234", "x.ts")).toThrow(
      /secret_pattern/,
    );
  });

  it("validates nextjs framework readiness", () => {
    const ok = validateFrameworkReadiness("nextjs", sampleManifest);
    expect(ok.valid).toBe(true);
    const bad = validateFrameworkReadiness("nextjs", []);
    expect(bad.valid).toBe(false);
    expect(bad.issues).toContain("missing_package_json");
  });

  it("fail-closes unsupported frameworks", () => {
    const r = validateFrameworkReadiness("unknown_framework", sampleManifest);
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("unsupported_framework");
  });

  it("rejects invalid package.json", () => {
    const r = validatePackageJsonContent("{not-json");
    expect(r.valid).toBe(false);
  });

  describe("repository naming", () => {
    beforeEach(() => {
      delete process.env.LIVE_PROVIDER_TEST_MODE;
    });

    it("does not double-prefix in test mode", () => {
      process.env.LIVE_PROVIDER_TEST_MODE = "true";
      const first = resolveApprovedRepositoryName("infinity-live-test");
      const second = resolveApprovedRepositoryName(first.repoName);
      expect(first.repoName).toBe("infinity-test-infinity-live-test");
      expect(second.repoName).toBe(first.repoName);
    });

    it("rejects test prefix outside test mode", () => {
      expect(() => resolveApprovedRepositoryName("infinity-test-foo")).toThrow(
        /test_prefix_not_allowed/,
      );
    });

    it("asserts production name immutability", () => {
      process.env.LIVE_PROVIDER_TEST_MODE = "true";
      expect(() =>
        assertRepositoryNameMatchesApproval({
          approvedTarget: "my-repo",
          resolvedName: "infinity-test-infinity-test-my-repo",
        }),
      ).toThrow(/repository_name_mutated/);
    });
  });

  describe("deployment lifecycle", () => {
    it("normalizes Vercel ready states", () => {
      expect(normalizeVercelReadyState("READY")).toBe("ready");
      expect(normalizeVercelReadyState("ERROR")).toBe("failed");
      expect(normalizeVercelReadyState("BUILDING")).toBe("building");
    });

    it("polls until ready", async () => {
      vi.useFakeTimers();
      let calls = 0;
      const poll = pollWithBackoff(async () => {
        calls += 1;
        if (calls >= 3) return { done: true, value: { id: "d1" }, state: "ready" };
        return { done: false, state: "building" };
      }, { maxAttempts: 5, initialDelayMs: 10, maxDelayMs: 20 });
      const promise = poll;
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result.state).toBe("ready");
      vi.useRealTimers();
    });

    it("times out when provider never ready", async () => {
      vi.useFakeTimers();
      const poll = pollWithBackoff(async () => ({ done: false, state: "building" }), {
        maxAttempts: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
      });
      const promise = poll;
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result.state).toBe("timed_out");
      vi.useRealTimers();
    });
  });

  describe("HTTP verification", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("succeeds on healthy response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("<html>ok</html>", { status: 200 })),
      );
      const r = await verifyLiveHttp({ url: "https://example.com" });
      expect(r.verified).toBe(true);
      expect(r.statusCode).toBe(200);
    });

    it("fails when secrets exposed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("GITHUB_TOKEN=leak", { status: 200 })),
      );
      const r = await verifyLiveHttp({ url: "https://example.com" });
      expect(r.verified).toBe(false);
      expect(r.secretExposureDetected).toBe(true);
    });
  });

  describe("github artifact push (mocked)", () => {
    it("pushes blobs and returns commit sha", async () => {
      const fetchFn = vi.fn(async (path: string, init?: RequestInit) => {
        if (path.includes("/git/ref/heads/main")) {
          return new Response(JSON.stringify({ object: { sha: "base" } }), { status: 200 });
        }
        if (path.includes("/git/blobs")) {
          return new Response(JSON.stringify({ sha: `blob-${Math.random()}` }), { status: 201 });
        }
        if (path.includes("/git/trees") && init?.method === "POST") {
          return new Response(JSON.stringify({ sha: "tree1" }), { status: 201 });
        }
        if (path.includes("/git/commits")) {
          return new Response(JSON.stringify({ sha: "commitabc" }), { status: 201 });
        }
        if (path.includes("/git/refs/heads/main")) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      });

      const result = await pushProductionArtifactToGithub(fetchFn, {
        repositoryFullName: "org/repo",
        artifactId: "art-1",
        artifactHash: "hash-1",
        files: [
          {
            relativePath: "index.html",
            contentHash: "h",
            byteSize: 5,
            fileMode: "100644",
            contentText: "hello",
          },
        ],
      });
      expect(result.commitSha).toBe("commitabc");
      expect(result.fileCount).toBe(2);
    });

    it("verifies tree file count", async () => {
      const fetchFn = vi.fn(async (path: string) => {
        if (path.includes("/git/commits/commit1")) {
          return new Response(JSON.stringify({ tree: { sha: "t1" } }), { status: 200 });
        }
        if (path.includes("/git/trees/t1")) {
          return new Response(
            JSON.stringify({
              tree: [
                { path: "INFINITY_ARTIFACT_IDENTITY.json", type: "blob" },
                { path: "index.html", type: "blob" },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      });
      const v = await verifyGithubTreeAgainstManifest(fetchFn, {
        repositoryFullName: "o/r",
        commitSha: "commit1",
        expectedFileCount: 2,
        criticalPaths: ["INFINITY_ARTIFACT_IDENTITY.json"],
      });
      expect(v.verified).toBe(true);
    });
  });

  describe("approval binding", () => {
    it("detects payload hash change for artifact identity", async () => {
      const { hashPayloadManifest } = await import(
        "@/lib/infinity/launch-gateway/resource-registry"
      );
      const base = {
        production_artifact_id: "a1",
        content_hash: "abc123",
      };
      const h1 = hashPayloadManifest(base);
      const h2 = hashPayloadManifest({ ...base, content_hash: "def456" });
      expect(h1).not.toBe(h2);
    });
  });
});
