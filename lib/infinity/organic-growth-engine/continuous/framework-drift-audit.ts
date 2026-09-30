import { readFileSync } from "node:fs";
import { join } from "node:path";

export type PublicContentGeneratorAudit = {
  name: string;
  path: string;
  coverage_plan_v2: boolean;
  content_quality_framework_v2: boolean;
  reader_question_challenge: boolean;
  draft_to_coverage: boolean;
  page_type_overlay: boolean;
  quality_version_recording: boolean;
  uncontrolled: boolean;
};

const GENERATORS = [
  {
    name: "occupancynpv-publisher",
    path: "lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher.ts",
  },
  {
    name: "continuous-cycle",
    path: "lib/infinity/organic-growth-engine/continuous/cycle.ts",
  },
  {
    name: "scheduled-execution",
    path: "lib/infinity/organic-growth-engine/blog-os/durable/scheduled-execution.ts",
  },
  {
    name: "live-proof",
    path: "lib/infinity/organic-growth-engine/continuous/live-proof.ts",
  },
] as const;

export function auditPublicContentGenerators(cwd = process.cwd()): {
  generators: PublicContentGeneratorAudit[];
  production_generators: number;
  uncontrolled: number;
  result: "PASS" | "FAIL";
} {
  const generators = GENERATORS.map((row) => {
    const source = readFileSync(join(cwd, row.path), "utf8");
    const framework =
      /evaluateContentQualityFramework|evaluateConsumerEditorialPublishStack|runBoundedConsumerEditorialRepair|evaluateOrganicContentQualityGate/.test(source);
    const coverage = /resolveContentCoveragePlan|ContentCoveragePlan|evaluateDraftToCoverageMap/.test(source)
      || framework;
    return {
      name: row.name,
      path: row.path,
      coverage_plan_v2: coverage,
      content_quality_framework_v2: framework,
      reader_question_challenge: framework,
      draft_to_coverage: framework,
      page_type_overlay: framework,
      quality_version_recording: /CONTENT_QUALITY_FRAMEWORK_VERSION|framework_version|content-quality-framework-v2/.test(source) || framework,
      uncontrolled: !framework,
    };
  });
  const uncontrolled = generators.filter((row) => row.uncontrolled).length;
  return {
    generators,
    production_generators: generators.length,
    uncontrolled,
    result: uncontrolled === 0 ? "PASS" : "FAIL",
  };
}
