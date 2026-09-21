import { executePremiumAuthoritySuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/premium-authority-successor-deploy";

const result = await executePremiumAuthoritySuccessorAuthorizedDeploy();
const { files: _files, ...reportable } = result;
void _files;
process.stdout.write(`${JSON.stringify(reportable, null, 2)}\n`);
if (result.stopReason !== "PREMIUM_AUTHORITY_SUCCESSOR_PUBLIC") {
  process.exitCode = 2;
}
