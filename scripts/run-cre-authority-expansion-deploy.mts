import { writeFile } from "node:fs/promises";
import { executeAuthorityExpansionSuccessorAuthorizedDeploy } from "../lib/infinity/market-validation-experiment/cre-authority-expansion-successor-deploy";

const result = await executeAuthorityExpansionSuccessorAuthorizedDeploy();
const slim = {
  ...result,
  live: result.live
    ? {
        ...result.live,
        routes: result.live.routes
          ? {
              ...result.live.routes,
              pages: Object.fromEntries(
                Object.entries(result.live.routes.pages ?? {}).map(([route, page]) => [
                  route,
                  { status: page.status, ok: page.ok, location: page.location, bytes: page.body?.length ?? 0 },
                ]),
              ),
            }
          : null,
      }
    : null,
};
await writeFile(".infinity/authority-expansion-deploy-result.json", `${JSON.stringify(slim, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(slim, null, 2)}\n`);
if (result.providerFinalState === "NOT_DEPLOYED") {
  process.exitCode = result.attempted ? 2 : 3;
} else if (result.providerFinalState !== "READY" || !result.activated) {
  process.exitCode = 2;
}
