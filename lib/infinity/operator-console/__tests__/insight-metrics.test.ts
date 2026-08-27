import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import type { HQEntityDetail } from "../details/entity-detail-types";
import type { HqWorkArtifact } from "../artifacts/types";
import {
  INSIGHT_METRIC_IDS,
  collectInsightMetrics,
  dedupeInsightMetrics,
  formatBuildReadyDisplay,
  insightMetricRow,
  reactKeyForInsightMetric,
} from "../details/insight-metrics";

const CMS_METRICS = [
  { id: INSIGHT_METRIC_IDS.opportunityQuality, label: "Opportunity quality", value: "65.46" },
  { id: INSIGHT_METRIC_IDS.selectionScore, label: "Selection score", value: "52.49" },
  { id: INSIGHT_METRIC_IDS.portfolioAdjustedScore, label: "Portfolio-adjusted score", value: "52.49" },
  { id: INSIGHT_METRIC_IDS.validationScore, label: "Validation score", value: "59.85" },
  { id: INSIGHT_METRIC_IDS.monetizationScore, label: "Monetization score", value: "54" },
  { id: INSIGHT_METRIC_IDS.validateThreshold, label: "VALIDATE threshold", value: "58" },
  { id: INSIGHT_METRIC_IDS.rejectThreshold, label: "REJECT threshold", value: "45" },
];

describe("insight metric identity", () => {
  it("assigns unique semantic IDs to the CMS founder metric set", () => {
    const keys = CMS_METRICS.map(reactKeyForInsightMetric);
    expect(new Set(keys).size).toBe(CMS_METRICS.length);
    expect(keys).toEqual([
      "opportunity-quality",
      "selection-score",
      "portfolio-adjusted-score",
      "validation-score",
      "monetization-score",
      "validate-threshold",
      "reject-threshold",
    ]);
  });

  it("dedupes identical canonical metrics emitted by two builders", () => {
    const metrics = collectInsightMetrics([
      {
        id: "scores",
        title: "Scores",
        rows: [insightMetricRow(INSIGHT_METRIC_IDS.selectionScore, "Selection score", "52.49")],
      },
      {
        id: "breakdown",
        title: "Score breakdown",
        rows: [insightMetricRow(INSIGHT_METRIC_IDS.selectionScore, "Selection score", "52.49")],
      },
    ]);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.id).toBe("selection-score");
    expect(metrics[0]?.value).toBe("52.49");
  });

  it("fails closed when the same metric id has conflicting values", () => {
    expect(() =>
      dedupeInsightMetrics([
        { id: INSIGHT_METRIC_IDS.selectionScore, label: "Selection score", value: "52.49" },
        { id: INSIGHT_METRIC_IDS.selectionScore, label: "Selection score", value: "70" },
      ]),
    ).toThrow(/INSIGHT_METRIC_ID_CONFLICT/);
  });

  it("keeps selection score distinct from selection vs VALIDATE threshold", () => {
    const metrics = collectInsightMetrics([
      {
        id: "scores",
        title: "Scores",
        rows: [
          insightMetricRow(INSIGHT_METRIC_IDS.selectionScore, "Selection score", "52.49"),
          insightMetricRow(
            INSIGHT_METRIC_IDS.selectionScoreValidateThreshold,
            "Selection score vs VALIDATE threshold",
            "52.49 vs 58",
          ),
        ],
      },
    ]);
    expect(metrics.map((item) => item.id)).toEqual(["selection-score", "selection-score-validate-threshold"]);
    expect(metrics.map((item) => item.label)).toEqual(["Selection score", "Selection score vs VALIDATE threshold"]);
  });

  it("formats build readiness from buildReady, never from the decision string", () => {
    expect(formatBuildReadyDisplay(false)).toBe("NO");
    expect(formatBuildReadyDisplay("NO")).toBe("NO");
    expect(formatBuildReadyDisplay(true)).toBe("YES");
    expect(formatBuildReadyDisplay("YES")).toBe("YES");
    expect(formatBuildReadyDisplay("HOLD")).toBe("NO");
    expect(formatBuildReadyDisplay("VALIDATE")).toBe("NO");
    expect(formatBuildReadyDisplay("REJECT")).toBe("NO");
    expect(formatBuildReadyDisplay("BUILD")).toBe("NO");
    expect(formatBuildReadyDisplay(null)).toBe("NO");
  });
});

describe("HQOutputDetail metric keys", () => {
  it("renders founder metrics without duplicate React keys", () => {
    const source = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    expect(source).toMatch(/key=\{metric\.id/);
    expect(source).not.toMatch(/key=\{metric\.label\}/);
    expect(source).not.toMatch(/insights\.metrics\.map\(\(metric,\s*index\)/);

    const artifact: HqWorkArtifact = {
      id: "founder:cms",
      roomId: "opportunity_lab",
      artifactType: "founder_idea",
      title: "Infinity CMS",
      subtitle: "FOUNDER · HELD",
      state: "READY",
      createdAt: null,
      sourceRecordType: "founder_idea_submission",
      sourceRecordId: "sub-1",
      metadata: {},
    };
    const detail: HQEntityDetail = {
      entityType: "founder_idea",
      entityId: artifact.id,
      title: artifact.title,
      subtitle: artifact.subtitle,
      status: "HELD",
      summary: "HOLD between VALIDATE 58 and REJECT 45.",
      decision: "HOLD",
      decisionWhy: "52.49 < 58 VALIDATE threshold",
      overview: { sections: [] },
      insights: { hotTakes: [], metrics: CMS_METRICS },
      evidence: { sections: [] },
      timeline: { phases: [] },
      system: { rows: [] },
      relatedWork: [],
      availableTabs: ["insights"],
    };

    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact }));
    spy.mockRestore();
    expect(html).toContain("Selection score");
    expect(html).toContain("Portfolio-adjusted score");
    expect(html).toContain("Validation score");
    expect(html).toContain("Monetization score");
    expect(html).toContain("VALIDATE threshold");
    expect(html).toContain("REJECT threshold");
    expect(errors.some((line) => /Encountered two children with the same key/i.test(line))).toBe(false);
    const selectionCount = html.split("Selection score").length - 1;
    expect(selectionCount).toBe(1);
  });
});
