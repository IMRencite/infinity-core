import type { CloudRuntimeHqProjection } from "./types";

export function publicCloudRuntimeProjection(): {
  capability: "Cloud Runtime";
  public_activity: string;
} {
  return {
    capability: "Cloud Runtime",
    public_activity: "Partnerships & operations continue on the public floor",
  };
}

export function publicProjectionHidesRuntimeSecrets(serialized: string): boolean {
  return !/CRON_SECRET|SERVICE_ROLE|WAKE_SECRET|sk_live_|Bearer |supabase\.co\/|mission:|candidate:/.test(serialized);
}

export function hqProjectionIsObserverOnly(view: CloudRuntimeHqProjection): boolean {
  return view.execution_dependency === false && view.distinction === "CLOUD";
}
