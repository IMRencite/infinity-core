import { executeDirectResponseSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-dr-successor-deploy";

const result = await executeDirectResponseSuccessorAuthorizedDeploy();
const { files: _files, midRun: _mid, ...reportable } = result;
void _files;
void _mid;
process.stdout.write(`${JSON.stringify({ ...reportable, midRunPhases: result.midRun.map((item) => item.phase) }, null, 2)}\n`);
if (result.stopReason !== "CRE_DIRECT_RESPONSE_ANSWER_AUTHORITY_SUCCESSOR_PUBLIC") {
  process.exitCode = 2;
}
