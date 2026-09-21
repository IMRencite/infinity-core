import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { composePricingPrerenderRepairFiles } from "../lib/infinity/venture-website-architecture/compose-pricing-prerender-repair.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const frozen = process.env.TEMP + "\\infinity-isolated-artifact-7jCjbe";
const search = await reconstructCreSearchDepthSuccessor();
const composed = composePricingPrerenderRepairFiles({
  files: search.files,
  artifactId: "art_e9e0356a261866b6d534",
  predecessorArtifactId: search.artifactId,
  predecessorDigest: search.digest,
});
const paths = [
  "app/globals.css",
  "app/commercial-lease-npv/page.tsx",
  "app/pricing/page.tsx",
  "components/validation-grade.tsx",
  "artifact-manifest.json",
];
for (const rel of paths) {
  const live = composed.files.find((file) => file.path.replace(/\\/g, "/") === rel)?.content ?? "";
  let frozenContent = "";
  try {
    frozenContent = await readFile(`${frozen}\\${rel.replace(/\//g, "\\")}`, "utf8");
  } catch {
    frozenContent = "MISSING";
  }
  const h = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12);
  process.stdout.write(
    `${rel}\tlive=${h(live)}\tfrozen=${h(frozenContent)}\tmatch=${live === frozenContent}\tliveLen=${live.length}\tfrozenLen=${frozenContent.length}\n`,
  );
}
const founder = pageContent(composed.files, "/commercial-lease-npv");
process.stdout.write(`founderBand=${founder.includes("pv-discovery-band")} frozenBand=${(await readFile(`${frozen}\\app\\commercial-lease-npv\\page.tsx`, "utf8")).includes("pv-discovery-band")}\n`);
process.stdout.write(`searchDigest=${search.digest}\n`);
