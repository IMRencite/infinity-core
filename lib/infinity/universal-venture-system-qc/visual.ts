export const DEFAULT_BROWSER_STYLE_DETECTION_GATE = "DefaultBrowserStyleDetectionGate" as const;
export const RENDERED_STYLE_APPLICATION_GATE = "RenderedStyleApplicationGate" as const;
export const VENTURE_DESIGN_SYSTEM_CONFORMANCE_GATE = "VentureDesignSystemConformanceGate" as const;
export const RENDERED_VISUAL_QUALITY_GATE = "RenderedVisualQualityGate" as const;
export const VENTURE_VISUAL_REGRESSION_GATE = "VentureVisualRegressionGate" as const;

export type ComputedStyleObservation = {
  name: string;
  tag: string;
  class_name: string;
  required: boolean;
  computed: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    lineHeight?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    border?: string;
    background?: string;
    width?: string;
    minHeight?: string;
    display?: string;
    appearance?: string;
  };
};

const BROWSER_DEFAULT_BUTTON = /^(none|auto|button)?$/i;

export function evaluateDefaultBrowserStyleDetectionGate(controls: readonly ComputedStyleObservation[]): {
  gate: typeof DEFAULT_BROWSER_STYLE_DETECTION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  unstyled: string[];
} {
  const unstyled: string[] = [];
  const reasons: string[] = [];
  for (const control of controls) {
    if (!control.required) continue;
    const looksDefault =
      /^(button|textarea|input|select)$/i.test(control.tag)
      && (!control.class_name || !/vg-cta|vg-textarea|vg-input|vg-form|onpv-btn|onpv-intake|pv-cta/.test(control.class_name)
        || isBrowserDefaultComputed(control));
    if (looksDefault && isBrowserDefaultComputed(control)) {
      unstyled.push(control.name);
      reasons.push(`BROWSER_DEFAULT_CONTROL:${control.name}`);
    }
  }
  return {
    gate: DEFAULT_BROWSER_STYLE_DETECTION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    unstyled,
  };
}

function isBrowserDefaultComputed(control: ComputedStyleObservation): boolean {
  const style = control.computed;
  const radius = style.borderRadius ?? "0px";
  const padding = style.padding ?? "0px";
  const minHeight = style.minHeight ?? "auto";
  const background = style.background ?? "";
  const appearance = style.appearance ?? "auto";
  if (/button/i.test(control.tag)) {
    return (
      BROWSER_DEFAULT_BUTTON.test(appearance)
      && (radius === "0px" || radius === "2px")
      && (!style.minHeight || minHeight === "auto")
      && /^(rgba?\(0, 0, 0, 0\)|transparent|buttonface|#?\s*$)/i.test(background)
    );
  }
  if (/textarea|input/i.test(control.tag)) {
    const defaultPadding = padding === "0px" || padding === "1px 2px" || padding === "2px";
    const defaultRadius = radius === "0px" || radius === "2px";
    const defaultFont = /monospace/i.test(style.fontFamily ?? "");
    return (defaultRadius && defaultPadding && appearance !== "none") || defaultFont;
  }
  return false;
}

export function evaluateRenderedStyleApplicationGate(input: {
  expected_class: string;
  class_in_dom: boolean;
  computed_matches_venture: boolean;
}): { gate: typeof RENDERED_STYLE_APPLICATION_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.class_in_dom) reasons.push(`CLASS_MISSING:${input.expected_class}`);
  if (input.class_in_dom && !input.computed_matches_venture) {
    reasons.push(`CLASS_PRESENT_STYLE_NOT_APPLIED:${input.expected_class}`);
  }
  return {
    gate: RENDERED_STYLE_APPLICATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export type OccupancynpvDesignTokens = {
  cta_class: "vg-cta vg-cta--primary";
  field_class: "vg-form-field";
  textarea_class: "vg-textarea";
  input_class: "vg-input";
  surface_class: "pv-surface";
  accent: string;
};

export function occupancynpvDesignTokens(): OccupancynpvDesignTokens {
  return {
    cta_class: "vg-cta vg-cta--primary",
    field_class: "vg-form-field",
    textarea_class: "vg-textarea",
    input_class: "vg-input",
    surface_class: "pv-surface",
    accent: "#1d4e78",
  };
}

export function evaluateVentureDesignSystemConformanceGate(input: {
  html: string;
  tokens?: OccupancynpvDesignTokens;
}): { gate: typeof VENTURE_DESIGN_SYSTEM_CONFORMANCE_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const tokens = input.tokens ?? occupancynpvDesignTokens();
  const reasons: string[] = [];
  if (!input.html.includes(tokens.cta_class) && !input.html.includes("vg-cta--primary")) {
    reasons.push("CTA_NOT_VENTURE_BUTTON");
  }
  if (!input.html.includes(tokens.field_class)) reasons.push("FIELDS_NOT_VENTURE_FIELDS");
  if (input.html.includes("<textarea") && !input.html.includes(tokens.textarea_class)) reasons.push("TEXTAREA_NOT_VENTURE_STYLED");
  if (input.html.includes('type="email"') && !input.html.includes(tokens.input_class)) reasons.push("EMAIL_NOT_VENTURE_STYLED");
  if (!input.html.includes(tokens.surface_class) && !input.html.includes("vg-form")) reasons.push("SURFACE_NOT_VENTURE_CARD");
  if (/<button(?![^>]*vg-cta)[^>]*>/i.test(input.html) && /type="submit"/i.test(input.html)) {
    reasons.push("SUBMIT_NOT_VENTURE_CTA");
  }
  return {
    gate: VENTURE_DESIGN_SYSTEM_CONFORMANCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateRenderedVisualQualityGate(input: {
  unstyled_controls: number;
  layout_breaks: boolean;
  clipping: boolean;
  overflow: boolean;
  overlapping: boolean;
  hierarchy_ok: boolean;
  readable: boolean;
  buttons_malformed: boolean;
  founder_physical_fail?: boolean;
  related_paths_width_defect?: boolean;
  section_alignment_fail?: boolean;
}): { gate: typeof RENDERED_VISUAL_QUALITY_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.founder_physical_fail) reasons.push("FOUNDER_PHYSICAL_VISUAL_FAIL");
  if (input.unstyled_controls > 0) reasons.push(`UNSTYLED_CONTROLS:${input.unstyled_controls}`);
  if (input.layout_breaks) reasons.push("LAYOUT_BREAK");
  if (input.clipping) reasons.push("CLIPPING");
  if (input.overflow) reasons.push("OVERFLOW");
  if (input.overlapping) reasons.push("OVERLAP");
  if (!input.hierarchy_ok) reasons.push("HIERARCHY_FAILURE");
  if (!input.readable) reasons.push("UNREADABLE_TEXT");
  if (input.buttons_malformed) reasons.push("MALFORMED_BUTTON");
  if (input.related_paths_width_defect) reasons.push("RELATED_PATHS_BACKGROUND_NARROWER_THAN_CARDS");
  if (input.section_alignment_fail) reasons.push("SECTION_CONTAINER_ALIGNMENT_FAIL");
  return {
    gate: RENDERED_VISUAL_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateVentureVisualRegressionGate(input: {
  prior_accepted: boolean;
  intentional_redesign: boolean;
  missing_ui: boolean;
  unstyled_component: boolean;
  lost_cta: boolean;
  missing_footer: boolean;
  broken_layout: boolean;
}): { gate: typeof VENTURE_VISUAL_REGRESSION_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  if (input.intentional_redesign && !input.unstyled_component && !input.lost_cta && !input.missing_footer && !input.broken_layout) {
    return { gate: VENTURE_VISUAL_REGRESSION_GATE, result: "PASS", reasons: ["INTENTIONAL_REDESIGN_REPLACES_BASELINE"] };
  }
  const reasons: string[] = [];
  if (input.prior_accepted && input.missing_ui) reasons.push("MISSING_UI");
  if (input.unstyled_component) reasons.push("UNSTYLED_COMPONENT");
  if (input.lost_cta) reasons.push("LOST_CTA");
  if (input.missing_footer) reasons.push("MISSING_FOOTER");
  if (input.broken_layout) reasons.push("BROKEN_LAYOUT");
  return {
    gate: VENTURE_VISUAL_REGRESSION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function htmlHasRawSubmit(html: string): boolean {
  return /<button(?![^>]*class=)[^>]*type="submit"/i.test(html) || /<button type="submit"(?![^>]*class=)/i.test(html);
}
