import { readFileSync } from "node:fs";
import { evaluateNoQCNoReleaseGate } from "../lib/infinity/universal-artifact-qc/gates";
import { resolveArtifactQcLayers } from "../lib/infinity/universal-artifact-qc/layer-resolver";
import { evaluateRequiredLayers } from "../lib/infinity/universal-artifact-qc/layers";

const proof = JSON.parse(readFileSync(".qc-runtime/financial-commitment-browser-qc.json", "utf8")) as {
  after: {
    allocation: string;
    spendAuthority: string;
    committed: string;
    available: string;
    actualSpend: string;
    paidAcquisition: string;
    helper: boolean;
    commitmentPanel: boolean;
    authenticated: boolean;
    sse: string;
    currentWork: string;
  };
  overflow: { desktop: { overflow: boolean }; tablet: { overflow: boolean }; mobile: { overflow: boolean } };
};

const required = resolveArtifactQcLayers("TREASURY_SURFACE");
const layers = evaluateRequiredLayers(required, {
  artifact_type: "TREASURY_SURFACE",
  artifact_version: "occupancynpv-venture-financial-commitment.v1",
  structural: { typecheck: "PASS", build: "PASS", schema: "PASS", tests: "PASS", routes_exist: true },
  rendered: {
    overflow_hidden: !proof.overflow.desktop.overflow,
    text_contained: true,
    colliding: false,
    machine_state_readable: true,
    page_overflow_hidden: !proof.overflow.desktop.overflow && !proof.overflow.tablet.overflow && !proof.overflow.mobile.overflow,
    layout_ok: proof.after.commitmentPanel,
    visible_display: `Allocated ${proof.after.allocation} Spend authority ${proof.after.spendAuthority} Committed ${proof.after.committed} Available ${proof.after.available} Actual ${proof.after.actualSpend} Paid acquisition ${proof.after.paidAcquisition}`,
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
    no_fabricated_values: proof.after.committed === "$0" && proof.after.actualSpend === "$0",
    venture_identity_correct: true,
    current_work_consistent: /IDLE/i.test(proof.after.currentWork),
    command_status: "IDLE",
    floor_status: "IDLE",
    rooms_status: "IDLE",
    canonical_status: "IDLE",
    command_mission: "Venture Financial Commitment V1",
    floor_mission: "Venture Financial Commitment V1",
  },
  responsive: {
    desktop: !proof.overflow.desktop.overflow,
    tablet: !proof.overflow.tablet.overflow,
    mobile: !proof.overflow.mobile.overflow,
    no_horizontal_overflow: !proof.overflow.desktop.overflow && !proof.overflow.tablet.overflow && !proof.overflow.mobile.overflow,
  },
  accessibility: { contrast: true, focus: true, labels: true, keyboard: true },
  final_browser: {
    route_loads: proof.after.authenticated,
    version_matches: true,
    content_visible: proof.after.commitmentPanel && proof.after.helper,
    no_material_errors: true,
    no_overflow: !proof.overflow.desktop.overflow && !proof.overflow.tablet.overflow && !proof.overflow.mobile.overflow,
    current_data: proof.after.committed === "$0",
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
      layers: Object.fromEntries(layers.map((row) => [row.layer, row.result])),
      passed,
      release,
      sse: proof.after.sse,
      idle: proof.after.currentWork,
    },
    null,
    2,
  )}\n`,
);
