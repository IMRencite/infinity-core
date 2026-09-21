import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { executeOccupancynpvPaidProductDeployment } from "../lib/infinity/venture-operating-scale/occupancynpv-paid-product-deployment";

loadServerEnvFromLocalFile();

async function main() {
  const result = await executeOccupancynpvPaidProductDeployment({
    deploy: true,
    persistEvidence: false,
    pollAttempts: 50,
    pollDelayMs: 8000,
  });
  console.log("supabase_env_present:", result.supabaseEnvPresent ? "YES" : "NO");
  console.log("deployed:", result.deployed ? "YES" : "NO");
  console.log("deployment_id:", result.deploymentId ?? "NONE");
  console.log("safe_error:", result.safeError ?? "NONE");
  console.log("artifact_id:", result.composed.artifactId);
  console.log("digest:", result.composed.digest);
  console.log("predecessor_artifact:", result.composed.predecessorArtifactId);
  console.log("routes:", result.routes.summary);
  console.log("not_found:", result.routes.notFound);
  console.log("runtime_failures:", result.routes.runtimeFailures);
  console.log("unexpected_redirects:", result.routes.unexpectedRedirects);
  console.log("new_routes:", result.newRoutes.join(","));
  console.log("stripe_writes:", result.writes.stripeWrites);
  console.log("payment_activation:", result.writes.paymentActivation);
  console.log("public_launch:", result.writes.publicLaunch);
  console.log("unrelated_migrations:", result.writes.unrelatedMigrations);
}

main().catch((error) => {
  console.log("deploy_failed:", error instanceof Error ? error.message : "UNKNOWN");
  process.exit(1);
});
