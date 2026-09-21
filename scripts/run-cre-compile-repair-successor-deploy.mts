import { executeCompileRepairSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-compile-repair-successor-deploy";

const result = await executeCompileRepairSuccessorAuthorizedDeploy();
const { files: _files, midRun, ...reportable } = result;
void _files;
process.stdout.write(
  `${JSON.stringify(
    {
      ...reportable,
      midRunPhases: midRun.map((item) => item.phase),
    },
    null,
    2,
  )}\n`,
);
if (result.stopReason === "PRE_WRITE_GATE_FAILED" || result.providerFinalState === "NOT_DEPLOYED") {
  process.exitCode = result.attempted ? 2 : 3;
} else if (result.providerFinalState !== "READY" || !result.readyForActivation) {
  process.exitCode = 2;
}
