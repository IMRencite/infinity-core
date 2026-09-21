import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL,
} from "../lib/infinity/market-validation-experiment/constants";
import { verifyVisualSuccessorLivePublic } from "../lib/infinity/market-validation-experiment/cre-visual-successor-live-verify";

const live = await verifyVisualSuccessorLivePublic({
  url: DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL,
  artifactId: "art_6ef4203d174ac97ea748",
  experimentId: LOCKED_CRE_EXPERIMENT_ID,
  candidateId: CRE_CANDIDATE_ID,
});
const { pages: _pages, ...routes } = live.routes;
process.stdout.write(
  `${JSON.stringify(
    {
      seoGeoPassed: live.seoGeoPassed,
      visualPassed: live.visualPassed,
      routes,
      visual: live.visual,
    },
    null,
    2,
  )}\n`,
);
if (!live.seoGeoPassed || !live.visualPassed) process.exitCode = 2;
