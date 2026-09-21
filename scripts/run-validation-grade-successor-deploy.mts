import { executeValidationGradeSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/validation-grade-successor-deploy";

const result = await executeValidationGradeSuccessorAuthorizedDeploy();
const { files: _files, ...reportable } = result;
void _files;
process.stdout.write(`${JSON.stringify(reportable, null, 2)}\n`);
if (
  result.stopReason !== "VALIDATION_GRADE_SUCCESSOR_PUBLIC" &&
  result.stopReason !== "IDEMPOTENT_REPLAY"
) {
  process.exitCode = 2;
}
