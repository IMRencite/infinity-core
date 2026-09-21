export const PRIMARY_ACTION_DISCOVERABILITY_GATE = "PrimaryActionDiscoverabilityGate" as const;
export const APP_ACTION_HIERARCHY_GATE = "AppActionHierarchyGate" as const;
export const APP_ACTION_HIERARCHY_CONTRACT = "AppActionHierarchyContract" as const;
export const INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE = "InteractiveControlVisualHierarchyGate" as const;
export const FOUNDER_RENDERED_UX_CONTRADICTION_GATE = "FounderRenderedUXContradictionGate" as const;

export const APP_ACTION_HIERARCHY_PRINCIPLE =
  "PRIMARY PRODUCT ACTIONS MUST BE VISUALLY IDENTIFIABLE AS PRIMARY ACTIONS. AN ACTION CAN BE FUNCTIONALLY PRESENT AND STILL FAIL PRODUCT QC IF ITS VISUAL TREATMENT MAKES IT EASY TO MISS. BUTTON PRIORITY MUST REFLECT WORKFLOW PRIORITY. PRIMARY, SECONDARY, TERTIARY, AND DESTRUCTIVE ACTIONS MUST HAVE INTENTIONAL VISUAL HIERARCHY. A CORE NEXT-STEP ACTION MUST NOT LOOK LIKE AN INCIDENTAL UTILITY CONTROL. EVERY CUSTOMER-FACING APPLICATION MUST HAVE AN INTENTIONAL ACTION HIERARCHY BEFORE FINAL PRODUCTION-QUALITY PASS." as const;

export const APPLICATION_INTERFACE_FULL_QC_GATES = [
  PRIMARY_ACTION_DISCOVERABILITY_GATE,
  APP_ACTION_HIERARCHY_GATE,
  INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE,
  "CustomerWorkflowDeadEndGate",
  "RenderedVisualQualityGate",
  "ProductUnderstandingGate",
] as const;

export const APP_ACTION_REQUIRED_VIEWPORTS = [1440, 1366, 640, 375] as const;

export const APP_ACTION_SEMANTIC_ROLES = [
  "PRIMARY_EXECUTION",
  "PRIMARY_CONTINUATION",
  "SECONDARY",
  "TERTIARY",
  "DESTRUCTIVE",
  "NAVIGATION",
  "UTILITY",
] as const;
export type AppActionSemanticRole = (typeof APP_ACTION_SEMANTIC_ROLES)[number];

export const APP_ACTION_VISUAL_PRIORITIES = ["PRIMARY", "SECONDARY", "TERTIARY", "DESTRUCTIVE"] as const;
export type AppActionVisualPriority = (typeof APP_ACTION_VISUAL_PRIORITIES)[number];

export type NamedAppActionGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type AppActionHierarchyRow = {
  route: string;
  workflow: string;
  action_id: string;
  label: string;
  semantic_role: AppActionSemanticRole;
  workflow_priority: number;
  visual_priority: AppActionVisualPriority;
  expected_state: "enabled" | "disabled" | "hidden" | "empty_guidance";
  actual_state: "enabled" | "disabled" | "hidden" | "empty_guidance";
  discoverability: "OBVIOUS" | "WEAK" | "OBSCURE";
  contrast: "STRONG" | "WEAK" | "UNKNOWN";
  placement: string;
  status: "PASS" | "FAIL";
  justification?: string;
};

export type AppActionObservation = {
  action_id: string;
  label: string;
  semantic_role: AppActionSemanticRole;
  class_name: string;
  placement: string;
  isolated?: boolean;
  competing_stronger?: boolean;
  viewport_visible?: boolean;
  enabled?: boolean;
  present?: boolean;
  result_access?: boolean;
};

const PRIMARY_VISUAL = /onpv-btn-primary|onpv-btn-continuation|vg-cta(?!--secondary)/;
const SECONDARY_VISUAL = /onpv-btn-secondary|vg-cta--secondary/;
const TERTIARY_VISUAL = /onpv-btn-tertiary|onpv-link|underline/;
const DESTRUCTIVE_VISUAL = /onpv-btn-destructive|danger|archive/i;

export function visualPriorityFromClass(className: string): AppActionVisualPriority {
  if (DESTRUCTIVE_VISUAL.test(className) && !PRIMARY_VISUAL.test(className)) return "DESTRUCTIVE";
  if (PRIMARY_VISUAL.test(className)) return "PRIMARY";
  if (SECONDARY_VISUAL.test(className)) return "SECONDARY";
  return "TERTIARY";
}

export function semanticVisualAligned(semantic: AppActionSemanticRole, visual: AppActionVisualPriority): boolean {
  if (semantic === "PRIMARY_EXECUTION" || semantic === "PRIMARY_CONTINUATION") return visual === "PRIMARY";
  if (semantic === "SECONDARY") return visual === "SECONDARY" || visual === "PRIMARY";
  if (semantic === "DESTRUCTIVE") return visual === "DESTRUCTIVE" || visual === "TERTIARY";
  if (semantic === "TERTIARY" || semantic === "NAVIGATION" || semantic === "UTILITY") {
    return visual === "TERTIARY" || visual === "SECONDARY";
  }
  return true;
}

export function evaluatePrimaryActionDiscoverabilityGate(input: {
  html: string;
  actions: AppActionObservation[];
  founder_observes_weak_primary?: boolean;
}): NamedAppActionGate {
  const reasons: string[] = [];
  if (input.founder_observes_weak_primary) reasons.push("FOUNDER_PHYSICAL_WEAK_PRIMARY");
  for (const action of input.actions) {
    if (action.present === false) {
      if (action.semantic_role.startsWith("PRIMARY") && action.enabled !== false) {
        reasons.push(`PRIMARY_MISSING:${action.action_id}`);
      }
      continue;
    }
    const visual = visualPriorityFromClass(action.class_name);
    if ((action.semantic_role === "PRIMARY_EXECUTION" || action.semantic_role === "PRIMARY_CONTINUATION") && visual !== "PRIMARY") {
      reasons.push(`CORE_ACTION_VISUALLY_TERTIARY:${action.action_id}`);
    }
    if (action.isolated) reasons.push(`ISOLATED_WITHOUT_CONTEXT:${action.action_id}`);
    if (action.competing_stronger) reasons.push(`SECONDARY_DOMINATES:${action.action_id}`);
    if (action.viewport_visible === false) reasons.push(`NOT_IN_VIEWPORT:${action.action_id}`);
    if (action.result_access === false && action.semantic_role === "PRIMARY_CONTINUATION") {
      reasons.push(`RESULT_ACCESS_OBSCURE:${action.action_id}`);
    }
  }
  if (/View Latest Comparison/i.test(input.html) && /onpv-btn-secondary[^>]*>View Latest Comparison/i.test(input.html)) {
    reasons.push("VIEW_LATEST_COMPARISON_SECONDARY");
  }
  if (/View Latest Comparison/i.test(input.html) && /onpv-workspace-reopen/i.test(input.html) && !/data-result-continuation/i.test(input.html)) {
    reasons.push("VIEW_LATEST_COMPARISON_DETACHED");
  }
  return {
    gate: PRIMARY_ACTION_DISCOVERABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
  };
}

export function evaluateAppActionHierarchyGate(rows: AppActionHierarchyRow[]): NamedAppActionGate & {
  contract: typeof APP_ACTION_HIERARCHY_CONTRACT;
  rows: AppActionHierarchyRow[];
} {
  const reasons: string[] = [];
  for (const row of rows) {
    if (row.status === "FAIL") reasons.push(`HIERARCHY_FAIL:${row.action_id}`);
    if (!semanticVisualAligned(row.semantic_role, row.visual_priority) && !row.justification) {
      reasons.push(`SEMANTIC_VISUAL_MISMATCH:${row.action_id}`);
    }
    if (row.expected_state !== row.actual_state) reasons.push(`STATE_MISMATCH:${row.action_id}`);
    if (
      (row.semantic_role === "PRIMARY_EXECUTION" || row.semantic_role === "PRIMARY_CONTINUATION") &&
      row.discoverability !== "OBVIOUS"
    ) {
      reasons.push(`PRIMARY_NOT_OBVIOUS:${row.action_id}`);
    }
  }
  return {
    gate: APP_ACTION_HIERARCHY_GATE,
    contract: APP_ACTION_HIERARCHY_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    rows,
  };
}

export function evaluateInteractiveControlVisualHierarchyGate(input: {
  html: string;
  css?: string;
  controls: Array<{ label: string; class_name: string; semantic_role: AppActionSemanticRole }>;
}): NamedAppActionGate {
  const reasons: string[] = [];
  let primaryCount = 0;
  for (const control of input.controls) {
    const visual = visualPriorityFromClass(control.class_name);
    if (control.semantic_role === "PRIMARY_EXECUTION" || control.semantic_role === "PRIMARY_CONTINUATION") {
      primaryCount += 1;
      if (visual !== "PRIMARY") reasons.push(`PRIMARY_LOOKS_${visual}:${control.label}`);
    }
    if (control.semantic_role === "TERTIARY" && visual === "PRIMARY") {
      reasons.push(`TERTIARY_LOOKS_PRIMARY:${control.label}`);
    }
  }
  if (primaryCount > 4) reasons.push("TOO_MANY_PRIMARY_ACTIONS");
  if (/View Latest Comparison/i.test(input.html) && /onpv-btn-secondary[^>]*>View Latest Comparison/i.test(input.html)) {
    reasons.push("RESULT_ACTION_LOOKS_SECONDARY");
  }
  if (input.css && /onpv-btn-continuation/.test(input.html) && !/onpv-btn-continuation/.test(input.css)) {
    reasons.push("CONTINUATION_STYLE_MISSING");
  }
  return {
    gate: INTERACTIVE_CONTROL_VISUAL_HIERARCHY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateResultAccessDiscoverability(input: {
  result_generated: boolean;
  access_label_present: boolean;
  access_visually_primary: boolean;
  access_in_result_context: boolean;
}): NamedAppActionGate {
  const reasons: string[] = [];
  if (input.result_generated && !input.access_label_present) reasons.push("RESULT_ACCESS_MISSING");
  if (input.result_generated && !input.access_visually_primary) reasons.push("RESULT_ACCESS_WEAK");
  if (input.result_generated && !input.access_in_result_context) reasons.push("RESULT_ACCESS_DETACHED");
  return {
    gate: "ResultAccessDiscoverability",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function occupancynpvWorkspaceActionContract(html: string): AppActionHierarchyRow[] {
  const latestPresent = /View Latest Comparison/i.test(html);
  const latestPrimary = /onpv-btn-continuation[^>]*>[\s\S]*View Latest Comparison/i.test(html);
  const latestDetached = /onpv-workspace-reopen/i.test(html) && !/data-result-continuation/i.test(html);
  const comparePrimary = /onpv-btn-primary[^>]*>[\s\S]*Compare NPV/i.test(html) || /data-app-action="compare-npv"/i.test(html);
  return [
    {
      route: "/occupancynpv/app/workspaces/:id",
      workflow: "scenario_compare_result",
      action_id: "compare-npv",
      label: "Compare NPV",
      semantic_role: "PRIMARY_EXECUTION",
      workflow_priority: 1,
      visual_priority: comparePrimary ? "PRIMARY" : "SECONDARY",
      expected_state: "enabled",
      actual_state: /Compare NPV/i.test(html) ? "enabled" : "hidden",
      discoverability: comparePrimary ? "OBVIOUS" : "WEAK",
      contrast: comparePrimary ? "STRONG" : "WEAK",
      placement: "compare_panel",
      status: comparePrimary ? "PASS" : "FAIL",
    },
    {
      route: "/occupancynpv/app/workspaces/:id",
      workflow: "scenario_compare_result",
      action_id: "view-latest-comparison",
      label: "View Latest Comparison",
      semantic_role: "PRIMARY_CONTINUATION",
      workflow_priority: 1,
      visual_priority: latestPrimary ? "PRIMARY" : latestPresent ? "SECONDARY" : "TERTIARY",
      expected_state: latestPresent ? "enabled" : "empty_guidance",
      actual_state: latestPresent ? "enabled" : /data-result-empty/i.test(html) ? "empty_guidance" : "hidden",
      discoverability: latestPrimary && !latestDetached ? "OBVIOUS" : latestPresent ? "WEAK" : "OBSCURE",
      contrast: latestPrimary ? "STRONG" : "WEAK",
      placement: latestDetached ? "detached_reopen" : "compare_panel_result_state",
      status: (!latestPresent && /data-result-empty/i.test(html)) || (latestPrimary && !latestDetached) ? "PASS" : "FAIL",
    },
    {
      route: "/occupancynpv/app/workspaces/:id",
      workflow: "scenario_compare_result",
      action_id: "add-scenario",
      label: "Add Scenario",
      semantic_role: "SECONDARY",
      workflow_priority: 2,
      visual_priority: /onpv-btn-primary[^>]*>[\s\S]*Add First Scenario/i.test(html) ? "PRIMARY" : "SECONDARY",
      expected_state: "enabled",
      actual_state: /Add (First |Another )?Scenario/i.test(html) ? "enabled" : "hidden",
      discoverability: "OBVIOUS",
      contrast: "STRONG",
      placement: "scenario_collection",
      status: "PASS",
      justification: "Empty-state Add First Scenario may use primary fill because it is the only next step.",
    },
    {
      route: "/occupancynpv/app/workspaces/:id",
      workflow: "scenario_compare_result",
      action_id: "save-scenario",
      label: "Save Scenario",
      semantic_role: "SECONDARY",
      workflow_priority: 2,
      visual_priority: "SECONDARY",
      expected_state: "enabled",
      actual_state: /Save Scenario/i.test(html) ? "enabled" : "hidden",
      discoverability: "OBVIOUS",
      contrast: "STRONG",
      placement: "scenario_editor",
      status: /onpv-btn-secondary[^>]*>[\s\S]*Save Scenario/i.test(html) || !/Save Scenario/i.test(html) ? "PASS" : "FAIL",
    },
    {
      route: "/occupancynpv/app/workspaces/:id",
      workflow: "scenario_compare_result",
      action_id: "open-edit",
      label: "Open / Edit",
      semantic_role: "SECONDARY",
      workflow_priority: 3,
      visual_priority: "SECONDARY",
      expected_state: "enabled",
      actual_state: /Open \/ Edit/i.test(html) ? "enabled" : "hidden",
      discoverability: "OBVIOUS",
      contrast: "STRONG",
      placement: "scenario_card",
      status: "PASS",
    },
  ];
}

export function evaluateOccupancynpvWorkspaceActionHierarchy(html: string, css = ""): {
  discoverability: NamedAppActionGate;
  hierarchy: ReturnType<typeof evaluateAppActionHierarchyGate>;
  visual: NamedAppActionGate;
} {
  const rows = occupancynpvWorkspaceActionContract(html);
  const latestPresent = /View Latest Comparison/i.test(html);
  return {
    discoverability: evaluatePrimaryActionDiscoverabilityGate({
      html,
      actions: [
        {
          action_id: "compare-npv",
          label: "Compare NPV",
          semantic_role: "PRIMARY_EXECUTION",
          class_name: /onpv-btn-primary/.test(html) ? "onpv-btn-primary" : "",
          placement: "compare_panel",
          present: /Compare NPV/i.test(html),
        },
        {
          action_id: "view-latest-comparison",
          label: "View Latest Comparison",
          semantic_role: "PRIMARY_CONTINUATION",
          class_name: latestPresent ? (/onpv-btn-continuation/.test(html) ? "onpv-btn-continuation" : "onpv-btn-secondary") : "",
          placement: /data-result-continuation/.test(html) ? "compare_panel_result_state" : "detached",
          isolated: /onpv-workspace-reopen/.test(html) && !/data-result-continuation/.test(html),
          present: latestPresent,
          result_access: !latestPresent || (/onpv-btn-continuation/.test(html) && /data-result-continuation/.test(html)),
        },
      ],
    }),
    hierarchy: evaluateAppActionHierarchyGate(rows),
    visual: evaluateInteractiveControlVisualHierarchyGate({
      html,
      css,
      controls: [
        { label: "Compare NPV", class_name: "onpv-btn-primary", semantic_role: "PRIMARY_EXECUTION" },
        {
          label: "View Latest Comparison",
          class_name: latestPresent && /onpv-btn-continuation/.test(html) ? "onpv-btn-continuation" : latestPresent ? "onpv-btn-secondary" : "onpv-btn-continuation",
          semantic_role: "PRIMARY_CONTINUATION",
        },
        { label: "Save Scenario", class_name: "onpv-btn-secondary", semantic_role: "SECONDARY" },
        { label: "Open / Edit", class_name: "onpv-btn-secondary", semantic_role: "SECONDARY" },
        { label: "Add Scenario", class_name: "onpv-btn-secondary", semantic_role: "SECONDARY" },
      ],
    }),
  };
}
