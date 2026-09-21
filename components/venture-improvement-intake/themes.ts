export type VentureImprovementTheme = {
  name: string;
  trigger: string;
  dialogRoot: string;
  backdrop: string;
  dialog: string;
  title: string;
  label: string;
  input: string;
  textarea: string;
  primary: string;
  secondary: string;
  muted: string;
  error: string;
  success: string;
  actions: string;
};

export const occupancynpvImprovementTheme: VentureImprovementTheme = {
  name: "occupancynpv",
  trigger: "onpv-link",
  dialogRoot: "onpv-dialog-root onpv-intake-dialog-root",
  backdrop: "onpv-dialog-backdrop",
  dialog: "onpv-dialog onpv-intake-dialog",
  title: "",
  label: "onpv-intake-label",
  input: "",
  textarea: "onpv-intake-textarea",
  primary: "onpv-btn-primary",
  secondary: "onpv-btn-secondary",
  muted: "onpv-muted",
  error: "onpv-error",
  success: "onpv-muted",
  actions: "onpv-dialog-actions",
};

export const factoryVentureImprovementTheme: VentureImprovementTheme = {
  name: "venture",
  trigger: "vg-link",
  dialogRoot: "vg-dialog-root",
  backdrop: "vg-dialog-backdrop",
  dialog: "vg-dialog",
  title: "vg-title",
  label: "vg-label",
  input: "vg-input",
  textarea: "vg-textarea",
  primary: "vg-btn-primary",
  secondary: "vg-btn-secondary",
  muted: "vg-muted",
  error: "vg-error",
  success: "vg-success",
  actions: "vg-dialog-actions",
};
