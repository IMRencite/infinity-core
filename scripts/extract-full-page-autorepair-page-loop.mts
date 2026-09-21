import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(".infinity/full-page-autorepair-successor.json", "utf8")) as {
  artifactId: string;
  digest: string;
  routes: number;
  predecessorArtifactId: string;
  predecessorDigest: string;
  digestMatchesLock: boolean;
  founderVisualReviewReady: string;
  pageLoop: Record<string, unknown> & {
    files?: unknown;
    records?: Array<{
      route: string;
      finalState: string;
      gateResults?: Record<string, string>;
      failures?: string[];
    }>;
    fullRoute?: { overall?: string };
    promotion?: { overall?: string; readyForArtifact?: number };
  };
};

const { files, records, ...loop } = raw.pageLoop;
const ready = records?.filter((record) => record.finalState === "READY_FOR_ARTIFACT").length ?? null;
const contrastFail = records?.filter((record) => record.gateResults?.RenderedTextContrastGate === "FAIL").length ?? null;
const linkFail = records?.filter((record) => record.gateResults?.RenderedLinkContrastGate === "FAIL").length ?? null;
const humanFail = records?.filter((record) => record.gateResults?.HumanFirstPublicLanguageGate === "FAIL").length ?? null;
const seoFail = records?.filter((record) => record.gateResults?.SeoGeoGate === "FAIL" || record.failures?.includes("seo")).length ?? null;

process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: raw.artifactId,
      digest: raw.digest,
      routes: raw.routes,
      predecessorArtifactId: raw.predecessorArtifactId,
      predecessorDigest: raw.predecessorDigest,
      digestMatchesLock: raw.digestMatchesLock,
      founderVisualReviewReady: raw.founderVisualReviewReady,
      pageLoop: loop,
      readyForArtifact: ready,
      recordCount: records?.length ?? 0,
      contrastFail,
      linkFail,
      humanFail,
      seoFail,
    },
    null,
    2,
  )}\n`,
);
