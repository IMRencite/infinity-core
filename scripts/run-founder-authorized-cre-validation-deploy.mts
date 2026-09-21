import { executeFounderAuthorizedLiveValidation } from "../lib/infinity/market-validation-experiment/founder-authorized-deploy";

const result = await executeFounderAuthorizedLiveValidation();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.stopReason !== "COLLECTING" && result.stopReason !== "IDEMPOTENT_REPLAY") {
  process.exitCode = 2;
}
