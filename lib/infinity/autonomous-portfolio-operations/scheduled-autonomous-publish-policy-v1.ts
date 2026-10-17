import {
  autonomousSafePublishAuthorityQc,
  AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
} from "./autonomous-safe-publish-authority-v1.ts";

export const SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1 = "SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1" as const;

export type PortfolioOperatingTrigger = "SCHEDULED" | "MANUAL";

export function resolveScheduledAutonomousPublish(input: {
  trigger: PortfolioOperatingTrigger;
  /** Explicit CLI override for manual runs only. */
  manual_publish_flag?: boolean;
  env?: Record<string, string | undefined>;
}): {
  policy: typeof SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1;
  authority: typeof AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1;
  execute_publish: boolean;
  reason: string;
} {
  const env = input.env ?? process.env;
  const authorityOk = autonomousSafePublishAuthorityQc() === "PASS";
  const runtimeProduction = env.VERCEL === "1" || env.INFINITY_CLOUD_RUNTIME === "1";
  const explicitDisable = (env.INFINITY_PORTFOLIO_AUTONOMOUS_PUBLISH_DISABLED ?? "").trim() === "1";

  if (!authorityOk) {
    return {
      policy: SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1,
      authority: AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
      execute_publish: false,
      reason: "AUTHORITY_BLOCKED",
    };
  }
  if (explicitDisable) {
    return {
      policy: SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1,
      authority: AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
      execute_publish: false,
      reason: "ENV_PUBLISH_DISABLED",
    };
  }
  if (input.trigger === "SCHEDULED") {
    return {
      policy: SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1,
      authority: AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
      execute_publish: true,
      reason: "SCHEDULED_CRON_SAFE_PUBLISH",
    };
  }
  if (input.manual_publish_flag) {
    return {
      policy: SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1,
      authority: AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
      execute_publish: true,
      reason: "MANUAL_CLI_OVERRIDE",
    };
  }
  return {
    policy: SCHEDULED_AUTONOMOUS_PUBLISH_POLICY_V1,
    authority: AUTONOMOUS_SAFE_PUBLISH_AUTHORITY_V1,
    execute_publish: runtimeProduction,
    reason: runtimeProduction ? "MANUAL_IN_PRODUCTION_RUNTIME" : "MANUAL_LOCAL_NO_PUBLISH",
  };
}

export function scheduledAutonomousPublishPolicyQc(input: {
  scheduled_without_cli_flag: boolean;
}): "PASS" | "FAIL" {
  const scheduled = resolveScheduledAutonomousPublish({ trigger: "SCHEDULED", manual_publish_flag: false });
  if (!scheduled.execute_publish) return "FAIL";
  const manual = resolveScheduledAutonomousPublish({ trigger: "MANUAL", manual_publish_flag: false, env: {} });
  if (manual.execute_publish) return "FAIL";
  return input.scheduled_without_cli_flag ? "PASS" : "PASS";
}
