import { executeCompileRepairSuccessorAuthorizedActivation } from "../lib/infinity/market-validation-experiment/cre-compile-repair-successor-activation";

const result = await executeCompileRepairSuccessorAuthorizedActivation({ executeLive: true });
const { liveProof: _liveProof, dashboardAfter: _dashboardAfter, registry: _registry, pre, post, ...reportable } = result;
void _liveProof;
void _dashboardAfter;
void _registry;
process.stdout.write(
  `${JSON.stringify(
    {
      ...reportable,
      preGates: {
        artifactIdentity: pre.identity.artifactIdentity,
        digest: pre.identity.digest,
        deploymentIdentity: pre.identity.deploymentIdentity,
        providerReady: "providerReady" in pre ? pre.providerReady : null,
        served: "served" in pre && pre.served ? pre.served.status : null,
        routesChecked: "served" in pre && pre.served ? pre.served.routesChecked : null,
        lineage: "lineage" in pre ? pre.lineage : null,
        questionIdentity: "questionIdentity" in pre ? pre.questionIdentity : null,
        authority: "authority" in pre ? pre.authority : null,
        readyForActivation: pre.readyForActivation,
      },
      postVerify: {
        providerReady: post.provider?.readyState ?? null,
        routesChecked: post.served?.routesChecked ?? null,
        served: post.served?.status ?? null,
        homepage: post.live?.homepageHttp ?? null,
        earlyAccess: post.live?.form.earlyAccessRoute ?? null,
        candidate: post.live?.form.candidate ?? null,
        experiment: post.live?.form.experiment ?? null,
        artifactLineage: post.live?.form.successorArtifactLineage ?? null,
      },
    },
    null,
    2,
  )}\n`,
);
if (result.result.startsWith("BLOCKED") || result.result.startsWith("NO")) {
  process.exitCode = 2;
} else if (result.result.startsWith("PARTIAL")) {
  process.exitCode = 3;
}
