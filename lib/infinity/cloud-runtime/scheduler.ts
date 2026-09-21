import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CloudRuntimeSchedulerConfig = {
  mechanism: "VERCEL_CRON";
  hourly: boolean;
  daily: boolean;
  hourly_path: "/api/runtime/tick";
  daily_path: "/api/runtime/venture-operating-cycle";
  hourly_schedule: string | null;
  daily_schedule: string | null;
};

export function readCloudRuntimeSchedulerConfig(cwd = process.cwd()): CloudRuntimeSchedulerConfig {
  const raw = JSON.parse(readFileSync(join(cwd, "vercel.json"), "utf8")) as {
    crons?: Array<{ path: string; schedule: string }>;
  };
  const crons = raw.crons ?? [];
  const hourly = crons.find((row) => row.path === "/api/runtime/tick");
  const daily = crons.find((row) => row.path === "/api/runtime/venture-operating-cycle");
  return {
    mechanism: "VERCEL_CRON",
    hourly: Boolean(hourly),
    daily: Boolean(daily),
    hourly_path: "/api/runtime/tick",
    daily_path: "/api/runtime/venture-operating-cycle",
    hourly_schedule: hourly?.schedule ?? null,
    daily_schedule: daily?.schedule ?? null,
  };
}
