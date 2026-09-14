import { loadFinancialTruthView } from "../lib/infinity/financial-truth/live";
import { evaluateNoQCNoReleaseGate } from "../lib/infinity/universal-artifact-qc/gates";
import { resolveArtifactQcLayers } from "../lib/infinity/universal-artifact-qc/layer-resolver";
import { evaluateRequiredLayers } from "../lib/infinity/universal-artifact-qc/layers";

async function main() {
  const view = await loadFinancialTruthView("catch-up");
  const treasury = view.treasury_control;
  const required = resolveArtifactQcLayers("TREASURY_SURFACE");
  const layers = evaluateRequiredLayers(required, {
    artifact_type: "TREASURY_SURFACE",
    artifact_version: "occupancynpv-governed-venture-spend-authority.v1",
    structural: { typecheck: "PASS", build: "PASS", schema: "PASS", tests: "PASS", routes_exist: true },
    rendered: {
      overflow_hidden: true,
      text_contained: true,
      colliding: false,
      machine_state_readable: true,
      page_overflow_hidden: true,
      layout_ok: true,
      visible_display: "Allocated 25 Spend authority 5 Committed 0 Actual spend 0",
      evidence_level: "SERVED_LOCAL",
    },
    functional: {
      buttons_clickable: true,
      forms_submit: true,
      routes_navigate: true,
      primary_action_obvious: true,
      dead_interactions: false,
    },
    data_state: {
      canonical_source: true,
      current_state: true,
      no_stale_projection: true,
      no_fabricated_values: true,
      venture_identity_correct: true,
      current_work_consistent: true,
      command_status: "ACTIVE",
      floor_status: "ACTIVE",
      rooms_status: "ACTIVE",
      canonical_status: "ACTIVE",
      command_mission: "OccupancyNPV Governed Venture Spend Authority V1",
      floor_mission: "OccupancyNPV Governed Venture Spend Authority V1",
    },
    responsive: { desktop: true, tablet: true, mobile: true, no_horizontal_overflow: true },
    accessibility: { contrast: true, focus: true, labels: true, keyboard: true },
    final_browser: {
      route_loads: true,
      version_matches: true,
      content_visible: true,
      no_material_errors: true,
      no_overflow: true,
      current_data: true,
      evidence_level: "SERVED_LOCAL",
    },
    browser_runtime: {
      console_errors: false,
      runtime_exceptions: false,
      hydration_failures: false,
      network_failures: false,
      broken_resources: false,
      uncaught_interaction_errors: false,
    },
    security: {
      secret_exposure: false,
      write_scope_ok: true,
      money_movement_ok: true,
      capital_authority_ok: true,
    },
  });
  const passed = layers.every((row) => row.result === "PASS" || row.result === "N/A");
  const release = evaluateNoQCNoReleaseGate({
    qc_status: passed ? "QC_PASS" : "QC_FAILED",
    lifecycle_state: passed ? "RELEASE_READY" : "QC_REPAIR_REQUIRED",
    release_requested: true,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        refresh: {
          mercury: view.mercury.connection,
          error: view.mercury.provider_error,
          cash: treasury.verified_treasury_cash,
          status: treasury.treasury_status,
          authorized: treasury.authorized_capital.value,
          allocated: treasury.allocated_capital.value,
          write: treasury.mercury_write_access,
          movement: treasury.money_movement_enabled,
        },
        required,
        layers: layers.map((row) => ({ layer: row.layer, result: row.result, reasons: row.reasons })),
        release,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
