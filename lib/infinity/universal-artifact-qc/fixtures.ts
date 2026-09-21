import type { ArtifactQcEvidenceBundle } from "./evidence";

export const FINANCIAL_RECONCILIATION_OVERFLOW_ARTIFACT_ID =
  "artifact:infinity:hq-financial-reconciliation-containment-v1" as const;
export const FINANCIAL_RECONCILIATION_OVERFLOW_VERSION = "hq-financial-recon-containment.v1" as const;

export const ESCAPED_RECONCILIATION_STATUS = "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED" as const;

const structuralPass = {
  typecheck: "PASS" as const,
  build: "PASS" as const,
  schema: "PASS" as const,
  tests: "PASS" as const,
  routes_exist: true,
};

const functionalPass = {
  buttons_clickable: true,
  forms_submit: true,
  routes_navigate: true,
  primary_action_obvious: true,
  dead_interactions: false,
};

const dataStatePass = {
  canonical_source: true,
  current_state: true,
  no_stale_projection: true,
  no_fabricated_values: true,
  venture_identity_correct: true,
  current_work_consistent: true,
  command_status: "PRESENT_IDLE",
  floor_status: "PRESENT_IDLE",
  rooms_status: "PRESENT_IDLE",
  canonical_status: "COMPLETED",
  command_mission: null,
  floor_mission: null,
};

const responsivePass = {
  desktop: true,
  tablet: true,
  mobile: true,
  no_horizontal_overflow: true,
};

const accessibilityPass = {
  contrast: true,
  focus: true,
  labels: true,
  keyboard: true,
};

const securityPass = {
  secret_exposure: false,
  write_scope_ok: true,
  money_movement_ok: true,
  capital_authority_ok: true,
};

export function escapedFinancialCardEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "FINANCIAL_SURFACE",
    artifact_version: FINANCIAL_RECONCILIATION_OVERFLOW_VERSION,
    structural: structuralPass,
    rendered: {
      overflow_hidden: false,
      text_contained: false,
      colliding: true,
      machine_state_readable: false,
      page_overflow_hidden: false,
      layout_ok: false,
      visible_machine_state: ESCAPED_RECONCILIATION_STATUS,
      visible_display: `PASS / ${ESCAPED_RECONCILIATION_STATUS}`,
      evidence_level: "SERVED_LOCAL",
    },
    functional: functionalPass,
    data_state: dataStatePass,
    responsive: { ...responsivePass, no_horizontal_overflow: false },
    accessibility: accessibilityPass,
    final_browser: {
      route_loads: true,
      version_matches: true,
      content_visible: true,
      no_material_errors: true,
      no_overflow: false,
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
    security: securityPass,
  };
}

export function repairedFinancialCardEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "FINANCIAL_SURFACE",
    artifact_version: FINANCIAL_RECONCILIATION_OVERFLOW_VERSION,
    structural: structuralPass,
    rendered: {
      overflow_hidden: true,
      text_contained: true,
      colliding: false,
      machine_state_readable: true,
      page_overflow_hidden: true,
      layout_ok: true,
      visible_machine_state: ESCAPED_RECONCILIATION_STATUS,
      visible_display: "PASS\nProcessor confirmed —\ndestination not connected",
      evidence_level: "SERVED_LOCAL",
    },
    functional: functionalPass,
    data_state: dataStatePass,
    responsive: responsivePass,
    accessibility: accessibilityPass,
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
    security: securityPass,
  };
}

export function staleActiveWorkEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "STATE_BEHAVIOR_CHANGE",
    artifact_version: "hq-current-work.stale-active",
    structural: structuralPass,
    functional: functionalPass,
    data_state: {
      canonical_source: true,
      current_state: false,
      no_stale_projection: false,
      no_fabricated_values: true,
      venture_identity_correct: true,
      current_work_consistent: false,
      command_status: "ACTIVE_WORK",
      floor_status: "ACTIVE_WORK",
      rooms_status: "ACTIVE_WORK",
      canonical_status: "COMPLETED",
      command_mission: "Finished work still painted active",
      floor_mission: "Finished work still painted active",
    },
    final_browser: {
      route_loads: true,
      version_matches: true,
      content_visible: true,
      no_material_errors: true,
      no_overflow: true,
      current_data: false,
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
  };
}

export function idleCurrentWorkEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "STATE_BEHAVIOR_CHANGE",
    artifact_version: "hq-current-work.idle-agree",
    structural: structuralPass,
    functional: functionalPass,
    data_state: dataStatePass,
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
  };
}

export function thinCustomerPageEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "CONTENT_CHANGE",
    artifact_version: "thin-page.v1",
    structural: structuralPass,
    rendered: {
      overflow_hidden: true,
      text_contained: true,
      colliding: false,
      machine_state_readable: true,
      page_overflow_hidden: true,
      layout_ok: true,
      evidence_level: "SERVED_LOCAL",
    },
    responsive: responsivePass,
    content: {
      html: "<main><h1>Hi</h1><p>Welcome.</p></main>",
      page_type: "PRICING",
    },
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
  };
}

export function backendServiceEvidence(): ArtifactQcEvidenceBundle {
  return {
    artifact_type: "BACKEND_SERVICE",
    artifact_version: "ledger-adapter.v1",
    structural: structuralPass,
    functional: functionalPass,
    data_state: {
      ...dataStatePass,
      command_status: undefined,
      floor_status: undefined,
      rooms_status: undefined,
      canonical_status: undefined,
    },
    security: securityPass,
  };
}

export function sourceOnlyRenderedEvidence(): ArtifactQcEvidenceBundle {
  const repaired = repairedFinancialCardEvidence();
  return {
    ...repaired,
    rendered: { ...repaired.rendered!, evidence_level: "SOURCE" },
    final_browser: { ...repaired.final_browser!, evidence_level: "SOURCE" },
  };
}

export function browserErrorEvidence(): ArtifactQcEvidenceBundle {
  const repaired = repairedFinancialCardEvidence();
  return {
    ...repaired,
    browser_runtime: {
      console_errors: true,
      runtime_exceptions: true,
      hydration_failures: false,
      network_failures: false,
      broken_resources: false,
      uncaught_interaction_errors: false,
    },
    final_browser: { ...repaired.final_browser!, no_material_errors: false },
  };
}
