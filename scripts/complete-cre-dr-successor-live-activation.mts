import { completeDirectResponseSuccessorLiveActivation } from "../lib/infinity/market-validation-experiment/cre-dr-successor-deploy";

const result = await completeDirectResponseSuccessorLiveActivation({
  url: "https://infinity-validation-cre-lease-npv-e72beb7b-5le6m8tl1.vercel.app",
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.stopReason !== "CRE_DIRECT_RESPONSE_ANSWER_AUTHORITY_SUCCESSOR_PUBLIC") {
  process.exitCode = 2;
}
