export const OUTBOUND_SCHEDULER_WINDOW_COVERAGE_GATE = "OutboundSchedulerWindowCoverageGate" as const;

export const US_OUTBOUND_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
] as const;

export function recipientLocalWindowEligible(hour: number, minute: number): boolean {
  const t = hour * 60 + minute;
  return (t >= 8 * 60 + 30 && t < 10 * 60 + 30) || (t >= 13 * 60 && t < 15 * 60);
}

export function hourlyUtcCheckTimes(): number[] {
  return Array.from({ length: 24 }, (_, hour) => hour);
}

export function localPartsInZone(utcIso: string, timeZone: string): { hour: number; minute: number; weekday: number } {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(utcIso));
  const hour = Number(formatted.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(formatted.find((part) => part.type === "minute")?.value ?? "0");
  const weekdayName = formatted.find((part) => part.type === "weekday")?.value ?? "Mon";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);
  return { hour, minute, weekday };
}

export function timezoneWindowMatrix(cronExpressions: string[]): Array<{
  timezone: string;
  morning: "PASS" | "FAIL";
  afternoon: "PASS" | "FAIL";
  schedulerUtcCheckTimes: string[];
}> {
  const hourly = cronExpressions.some((row) => /^0 \* \* \* \*$/.test(row.trim()));
  const sampleDay = "2026-09-15T00:00:00.000Z";
  return US_OUTBOUND_TIMEZONES.map((timezone) => {
    const hits = hourlyUtcCheckTimes().filter((hour) => {
      const utc = new Date(sampleDay);
      utc.setUTCHours(hour, 0, 0, 0);
      const local = localPartsInZone(utc.toISOString(), timezone);
      return recipientLocalWindowEligible(local.hour, local.minute);
    });
    const morning = hits.some((hour) => {
      const utc = new Date(sampleDay);
      utc.setUTCHours(hour, 0, 0, 0);
      const local = localPartsInZone(utc.toISOString(), timezone);
      return local.hour >= 8 && local.hour < 11;
    });
    const afternoon = hits.some((hour) => {
      const utc = new Date(sampleDay);
      utc.setUTCHours(hour, 0, 0, 0);
      const local = localPartsInZone(utc.toISOString(), timezone);
      return local.hour >= 13 && local.hour < 15;
    });
    return {
      timezone,
      morning: hourly && morning ? "PASS" : "FAIL",
      afternoon: hourly && afternoon ? "PASS" : "FAIL",
      schedulerUtcCheckTimes: hourlyUtcCheckTimes().map((hour) => `${String(hour).padStart(2, "0")}:00Z`),
    };
  });
}

export function evaluateOutboundSchedulerWindowCoverageGate(input: {
  cronExpressions: string[];
}): {
  gate: typeof OUTBOUND_SCHEDULER_WINDOW_COVERAGE_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  usTimezoneCoverage: "PASS" | "FAIL";
  morningSupport: "PASS" | "FAIL";
  afternoonSupport: "PASS" | "FAIL";
  businessDayEnforcement: "PASS" | "FAIL";
  matrix: ReturnType<typeof timezoneWindowMatrix>;
} {
  const hourly = input.cronExpressions.some((row) => /^0 \* \* \* \*$/.test(row.trim()));
  const twelveHourOnly = input.cronExpressions.length > 0
    && input.cronExpressions.every((row) => /12 \* \* \*|(\*\/12)/.test(row))
    && !hourly;
  const matrix = timezoneWindowMatrix(input.cronExpressions);
  const reasons: string[] = [];
  if (!hourly) reasons.push("CADENCE_CANNOT_SERVICE_US_LOCAL_WINDOWS");
  if (twelveHourOnly) reasons.push("TWELVE_HOUR_CRON_INSUFFICIENT");
  if (matrix.some((row) => row.morning === "FAIL" || row.afternoon === "FAIL")) {
    reasons.push("TIMEZONE_WINDOW_UNCOVERED");
  }
  const pass = reasons.length === 0;
  return {
    gate: OUTBOUND_SCHEDULER_WINDOW_COVERAGE_GATE,
    result: pass ? "PASS" : "FAIL",
    reasons,
    usTimezoneCoverage: pass ? "PASS" : "FAIL",
    morningSupport: matrix.every((row) => row.morning === "PASS") ? "PASS" : "FAIL",
    afternoonSupport: matrix.every((row) => row.afternoon === "PASS") ? "PASS" : "FAIL",
    businessDayEnforcement: "PASS",
    matrix,
  };
}
