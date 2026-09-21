import { completePremiumAuthoritySuccessorLiveActivation } from "../lib/infinity/market-validation-experiment/premium-authority-successor-deploy";

const result = await completePremiumAuthoritySuccessorLiveActivation();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.stopReason !== "PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC") {
  process.exitCode = 2;
}
