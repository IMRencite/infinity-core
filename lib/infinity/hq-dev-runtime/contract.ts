export const HQ_DEV_RUNTIME_READINESS_GATE = "HQDevRuntimeReadinessGate" as const;

export const HQ_DEV_RUNTIME_READINESS_PRINCIPLE =
  "HQ MUST RENDER ON THE LOCAL DEV SERVER BEFORE ROOM-PROJECTION QC CAN BE TRUSTED." as const;

export type HqDevRuntimeProbe = {
  homepageStatus: number | null;
  dashboardStatus: number | null;
  compileCompleted: boolean;
  recurringCompileLoop: boolean;
  routeCompileHang: boolean;
  timeToFirstCompileMs: number | null;
  fatalBrowserErrors: number;
  fatalServerErrors: number;
  navigationResponds: boolean;
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
