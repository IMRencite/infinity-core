import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  bootstrapDiscoverySourceProviders,
  dedupeOpportunities,
  getDiscoverySourceProvider,
  listDiscoverySourceProviders,
  normalizeDiscoveryBatch,
  normalizeDiscoveryItem,
  rankScoredOpportunities,
  registerDiscoverySourceProvider,
  resetDiscoverySourceProvidersForTests,
  scoreDiscoveredOpportunity,
  isLiveDiscoveryFetchEnabled,
} from "@/lib/infinity/discovery";
import { runDiscoveryEnginePipeline } from "@/lib/infinity/discovery/pipeline/run";
import * as emitModule from "@/lib/infinity/discovery/events/emit";
import * as persistModule from "@/lib/infinity/discovery/pipeline/persist";
import type { DiscoveryRawItem, DiscoverySourceProvider } from "@/lib/infinity/discovery/types/provider";

describe("Opportunity Discovery Engine v1", () => {
  beforeEach(() => {
    resetDiscoverySourceProvidersForTests();
    vi.unstubAllEnvs();
  });

  describe("provider registry", () => {
    it("registers providers dynamically", () => {
      const stub: DiscoverySourceProvider = {
        id: "custom_feed",
        name: "Custom",
        sourceKey: "discovery.custom",
        version: "1.0.0",
        fetch: async () => [],
      };
      registerDiscoverySourceProvider(stub);
      expect(getDiscoverySourceProvider("custom_feed")).toBe(stub);
    });

    it("bootstraps default providers including manual", () => {
      bootstrapDiscoverySourceProviders();
      const ids = listDiscoverySourceProviders().map((p) => p.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "reddit",
          "hackernews",
          "product_hunt",
          "github_trending",
          "google_trends",
          "rss",
          "manual",
        ]),
      );
    });

    it("offline providers return no network items by default", async () => {
      bootstrapDiscoverySourceProviders();
      vi.stubEnv("DISCOVERY_ALLOW_LIVE_FETCH", "");
      const reddit = getDiscoverySourceProvider("reddit")!;
      const hn = getDiscoverySourceProvider("hackernews")!;
      expect(await reddit.fetch({ organizationId: "o1", scanId: "s1" })).toEqual([]);
      expect(await hn.fetch({ organizationId: "o1", scanId: "s1" })).toEqual([]);
      expect(isLiveDiscoveryFetchEnabled()).toBe(false);
    });
  });

  describe("normalization", () => {
    it("maps raw items to common opportunity shape", () => {
      const raw: DiscoveryRawItem = {
        externalId: "abc",
        title: "  SaaS idea  ",
        description: "Desc",
        url: "https://example.com/a",
        category: "product_demand",
        market: "b2b",
        keywords: ["saas"],
        payload: { x: 1 },
      };
      const normalized = normalizeDiscoveryItem(raw, "manual");
      expect(normalized.title).toBe("SaaS idea");
      expect(normalized.source).toBe("manual");
      expect(normalized.url).toBe("https://example.com/a");
      expect(normalized.id).toHaveLength(32);
      expect(normalized.rawPayload.externalId).toBe("abc");
    });

    it("normalizes batches", () => {
      const batch = normalizeDiscoveryBatch(
        [
          {
            externalId: "1",
            title: "A",
            description: "A",
            url: "https://a.test",
            payload: {},
          },
        ],
        "manual",
      );
      expect(batch).toHaveLength(1);
    });
  });

  describe("deduplication", () => {
    it("removes duplicate url/title within organization scope", () => {
      const base = normalizeDiscoveryItem(
        {
          externalId: "1",
          title: "Same",
          description: "d",
          url: "https://dup.test",
          payload: {},
        },
        "manual",
      );
      const copy = { ...base, id: "other-id" };
      const { unique, skipped } = dedupeOpportunities("org-1", [base, copy]);
      expect(unique).toHaveLength(1);
      expect(skipped).toBe(1);
    });
  });

  describe("ranking", () => {
    it("scores deterministically without LLM", () => {
      const normalized = normalizeDiscoveryItem(
        {
          externalId: "1",
          title: "Trend tool",
          description: "Automation",
          url: "https://example.com",
          category: "search_demand",
          market: "b2b",
          keywords: ["automation", "saas"],
          payload: {},
        },
        "manual",
      );
      const scored = scoreDiscoveredOpportunity(normalized);
      expect(scored.estimatedDemand).toBeGreaterThan(0);
      expect(scored.estimatedCompetition).toBeGreaterThan(0);
      expect(scored.estimatedRevenuePotential).toBeGreaterThan(0);
      expect(scored.confidence).toBeGreaterThan(0);
      expect(scored.overallScore).toBeGreaterThan(0);
      expect(scored.scoringVersion).toBe("discovery.rule_scoring_v1");
    });

    it("ranks higher overall scores first", () => {
      const low = scoreDiscoveredOpportunity(
        normalizeDiscoveryItem(
          {
            externalId: "l",
            title: "Low",
            description: "x",
            url: "https://l.test",
            category: "other",
            market: "general",
            payload: {},
          },
          "rss",
        ),
      );
      const high = scoreDiscoveredOpportunity(
        normalizeDiscoveryItem(
          {
            externalId: "h",
            title: "High",
            description: "x",
            url: "https://h.test",
            category: "search_demand",
            market: "b2b",
            keywords: ["a", "b", "c"],
            payload: {},
          },
          "manual",
        ),
      );
      const ranked = rankScoredOpportunities([low, high]);
      expect(ranked[0]?.overallScore).toBeGreaterThanOrEqual(ranked[1]!.overallScore);
    });
  });

  describe("pipeline", () => {
    it("runs fetch → normalize → dedupe → score → persist → events", async () => {
      bootstrapDiscoverySourceProviders();

      const emitSpy = vi.spyOn(emitModule, "emitDiscoveryPipelineEvent").mockResolvedValue(undefined);
      const persistSpy = vi
        .spyOn(persistModule, "persistDiscoveredOpportunity")
        .mockResolvedValue({
          opportunityId: "opp-1",
          created: true,
          signalId: "sig-1",
          scoreId: "score-1",
        });

      const admin = {} as import("@/lib/supabase/admin").AdminSupabaseClient;

      const result = await runDiscoveryEnginePipeline(admin, {
        organizationId: "org-1",
        scanId: "scan-1",
        providerIds: ["manual"],
        manualItems: [
          {
            externalId: "m1",
            title: "Manual opp",
            description: "From test manual provider",
            url: "https://manual.test/1",
            category: "market_signal",
            market: "b2b",
            keywords: ["test"],
            payload: {},
          },
        ],
      });

      expect(result.providersRun).toBe(1);
      expect(result.fetchedCount).toBe(1);
      expect(result.normalizedCount).toBe(1);
      expect(result.dedupedCount).toBe(1);
      expect(result.persistedCount).toBe(1);
      expect(persistSpy).toHaveBeenCalledTimes(1);
      expect(
        emitSpy.mock.calls.some((call) => call[1].eventType === "discovery.pipeline_completed"),
      ).toBe(true);

      emitSpy.mockRestore();
      persistSpy.mockRestore();
    });

    it("manual provider never requires live fetch", async () => {
      bootstrapDiscoverySourceProviders();
      const manual = getDiscoverySourceProvider("manual")!;
      const items = await manual.fetch({
        organizationId: "org",
        scanId: "scan",
        config: {
          items: [
            {
              externalId: "x",
              title: "T",
              description: "D",
              url: "https://t.test",
              payload: {},
            },
          ],
        },
      });
      expect(items).toHaveLength(1);
    });
  });
});
