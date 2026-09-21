import { executeFinalRepairSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-final-repair-successor-deploy";

const result = await executeFinalRepairSuccessorAuthorizedDeploy();
const { files: _files, midRun: _mid, ...reportable } = result;
void _files;
void _mid;
process.stdout.write(`${JSON.stringify({ ...reportable, midRunPhases: result.midRun.map((item) => item.phase) }, null, 2)}\n`);
if (result.stopReason !== "CRE_FINAL_REPAIR_SUCCESSOR_PUBLIC") {
  process.exitCode = 2;
}
