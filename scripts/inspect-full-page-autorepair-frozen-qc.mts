import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();
import { evaluateRenderedTextContrastGate } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-text-contrast-gate.ts";
import { evaluateRenderedLinkContrastGate } from "../lib/infinity/venture-website-architecture/public-authority-standard/rendered-link-contrast-gate.ts";
import { evaluateHumanFirstPublicLanguageGate } from "../lib/infinity/venture-website-architecture/human-first-public-language-gate.ts";
import { inspectMailboxObserverHealth } from "../lib/infinity/inbound-communication-runtime/observer-persist.ts";
import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence.ts";
import { CANONICAL_EVIDENCE_START } from "../lib/infinity/market-validation-experiment/experiment-clock.ts";

const raw = JSON.parse(readFileSync(".infinity/full-page-autorepair-successor.json", "utf8")) as {
  artifactId: string;
  digest: string;
  routes: number;
  predecessorArtifactId: string;
  pageLoop: { files: Array<{ path: string; content: string }>; overall: string };
};
const files = raw.pageLoop.files;
const css = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const cam = files.find((file) =>
  file.path.replace(/\\/g, "/").endsWith("app/commercial-lease-npv/should-cam-be-in-lease-npv/page.tsx"),
)?.content ?? "";
const text = evaluateRenderedTextContrastGate({ html: cam, css });
const links = evaluateRenderedLinkContrastGate({ html: cam, css });
const heading = text.samples.find((sample) => sample.role === "trusted_sources_title");
const link = text.samples.find((sample) => sample.role === "trusted_sources_link") ?? links.samples.find((sample) => sample.role === "trusted_sources_link");
let machine = 0;
let placeholders = 0;
for (const file of files.filter((item) => /app\/.+page\.tsx$/.test(item.path.replace(/\\/g, "/")))) {
  const human = evaluateHumanFirstPublicLanguageGate(file.content);
  machine += human.findings.length;
  placeholders += human.relatedPagePlaceholders;
}
const observer = inspectMailboxObserverHealth();
const clock = inspectExperimentClock();
const evidence = inspectRealMarketEvidence();
process.stdout.write(
  `${JSON.stringify(
    {
      artifactId: raw.artifactId,
      digest: raw.digest,
      routes: raw.routes,
      predecessor: raw.predecessorArtifactId,
      textContrast: text.overall,
      linkContrast: links.overall,
      sameColor: links.sameColorFailures,
      nearInvisible: links.nearInvisibleFailures,
      hoverFocus: links.hoverFocusFailures,
      missingText: text.missingMandatorySamples,
      missingLinks: links.missingSamples,
      cam: {
        board: heading?.background ?? link?.background ?? null,
        heading: heading?.color ?? null,
        link: link?.color ?? null,
        headingContrast: heading?.contrast ?? null,
        linkContrast: link?.contrast ?? null,
        headingSample: heading ? "PRESENT" : "MISSING",
        linkSample: link ? "PRESENT" : "MISSING",
        trustedSources: text.trustedSources,
        trustedSourcesLinks: text.trustedSourcesLinks,
      },
      humanFirstMachine: machine,
      placeholders,
      observer,
      experiment: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      clockRestarted: clock.evidenceStart !== CANONICAL_EVIDENCE_START,
    },
    null,
    2,
  )}\n`,
);
