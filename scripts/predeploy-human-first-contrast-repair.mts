import { writeFile } from "node:fs/promises";
import { runHumanFirstContrastRepairPredeployQc } from "../lib/infinity/market-validation-experiment/cre-human-first-contrast-repair-predeploy.ts";

const result = await runHumanFirstContrastRepairPredeployQc();
const slim = {
  artifactId: result.artifactId,
  digest: result.digest,
  digestParity: result.digestParity,
  identity: result.identity,
  routes: result.routes,
  ready: result.ready,
  remaining: result.audit.remaining,
  rendered: result.rendered,
  browserRendered: result.browserRendered,
  headings: result.headings,
  trustedSources: result.trustedSources,
  trustedSourcesLinks: result.trustedSourcesLinks,
  trustedSourcesBody: result.trustedSourcesBody,
  missingMandatorySamples: result.missingMandatorySamples,
  camRouteSampled: result.camRouteSampled,
  camHeadingSample: result.camHeadingSample,
  camLinkSample: result.camLinkSample,
  camBodySample: result.camBodySample,
  paleTitlesOnLight: result.paleTitlesOnLight,
  unscopedEmphasisLeaks: result.unscopedEmphasisLeaks,
  lightModulesOutsideCta: result.lightModulesOutsideCta,
  founderTokenOnly: result.founderTokenOnly,
  founderRendered: result.founderRendered,
  humanFirstFixtures: result.humanFirstFixtures,
  readability: result.readability,
  activeVoice: result.activeVoice,
  fourthGrade: result.fourthGrade,
  viewportPass: result.viewportPass,
  overflow: result.overflow,
  shots: result.shots,
  newDeterministicFailures: result.newDeterministicFailures,
  overall: result.overall,
};
await writeFile(".infinity/human-first-contrast-repair-predeploy.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
