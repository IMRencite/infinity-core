import { executeVisualTableDesignSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-visual-table-design-successor-deploy";

const result = await executeVisualTableDesignSuccessorAuthorizedDeploy();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.providerFinalState === "NOT_DEPLOYED") {
  process.exitCode = result.attempted ? 2 : 3;
} else if (result.providerFinalState !== "READY" || !result.activated) {
  process.exitCode = 2;
}
