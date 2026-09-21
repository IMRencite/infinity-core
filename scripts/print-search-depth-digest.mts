import { reconstructCreSearchDepthSuccessor } from "../lib/infinity/venture-website-architecture/cre-search-depth-successor.ts";
import { pageContent } from "../lib/infinity/venture-website-architecture/answer-authority/page-inspect.ts";

const successor = await reconstructCreSearchDepthSuccessor();
const css = successor.files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
const founder = pageContent(successor.files, "/commercial-lease-npv");
process.stdout.write(
  `${JSON.stringify(
    {
      digest: successor.digest,
      artifactId: successor.artifactId,
      cssHasDiscoveryLayout: css.includes("--pv-discovery-layout"),
      cssHasAutofit: /auto-fit[\s\S]{0,40}minmax\(\s*220px/.test(css),
      founderHasBand: founder.includes("pv-discovery-band"),
      founderHasBalanced: founder.includes("pv-discovery-grid--balanced"),
      founderHasRole: founder.includes("FOR_YOUR_ROLE"),
      pageLoop: successor.pageLoop.overall,
      requiredRepair: successor.pageLoop.requiredRepair,
    },
    null,
    2,
  )}\n`,
);
