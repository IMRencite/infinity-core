import { verifyAndActivatePublicValidationAfterProtection } from "../lib/infinity/market-validation-experiment/founder-authorized-protection";

const result = await verifyAndActivatePublicValidationAfterProtection();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.stopReason !== "COLLECTING") {
  process.exitCode = 2;
}
