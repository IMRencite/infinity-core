import { executeFounderAuthorizedProtectionConfigure } from "../lib/infinity/market-validation-experiment/founder-authorized-protection";

const result = await executeFounderAuthorizedProtectionConfigure();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.stopReason !== "COLLECTING") {
  process.exitCode = 2;
}
