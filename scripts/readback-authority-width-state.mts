import { inspectExperimentClock } from "../lib/infinity/market-validation-experiment/experiment-clock";
import { inspectRealMarketEvidence } from "../lib/infinity/market-validation-experiment/real-market-evidence";
import {
  authorityWidthSuccessorActivationMutationsConsumed,
  getCanonicalActivePublicValidationState,
  isAuthorityWidthSuccessorPublicActive,
} from "../lib/infinity/market-validation-experiment/active-public-artifact";

process.stdout.write(
  `${JSON.stringify(
    {
      clock: inspectExperimentClock(),
      evidence: inspectRealMarketEvidence(),
      active: getCanonicalActivePublicValidationState(),
      activationMutations: authorityWidthSuccessorActivationMutationsConsumed(),
      widthActive: isAuthorityWidthSuccessorPublicActive(),
    },
    null,
    2,
  )}\n`,
);
