export type DeploymentFailureReason =
  | "source_invalid"
  | "dependency_install_failed"
  | "framework_detection_failed"
  | "build_failed"
  | "configuration_invalid"
  | "provider_failed"
  | "timed_out"
  | "verification_failed";

export type SanitizedProviderDiagnostics = {
  errorCode?: string;
  errorMessage?: string;
  readyState?: string;
  stage?: string;
};

export function classifyVercelDeploymentFailure(input: {
  readyState?: string;
  errorCode?: string;
  errorMessage?: string;
  pollState?: string;
  verificationFailed?: boolean;
}): DeploymentFailureReason {
  if (input.verificationFailed) return "verification_failed";
  if (input.pollState === "timed_out") return "timed_out";
  const code = (input.errorCode ?? "").toUpperCase();
  const msg = (input.errorMessage ?? "").toLowerCase();
  if (code === "NEXT_NO_VERSION" || msg.includes("no next.js version")) {
    return "framework_detection_failed";
  }
  if (msg.includes("install") || code.includes("INSTALL")) {
    return "dependency_install_failed";
  }
  if (msg.includes("build") || code.includes("BUILD")) {
    return "build_failed";
  }
  if (msg.includes("root directory") || msg.includes("configuration")) {
    return "configuration_invalid";
  }
  if (input.readyState === "ERROR" || input.pollState === "failed") {
    return "build_failed";
  }
  return "provider_failed";
}

export function sanitizeVercelError(input: {
  errorCode?: string;
  errorMessage?: string;
  readyState?: string;
}): SanitizedProviderDiagnostics {
  const strip = (s: string) =>
    s
      .replace(/ghp_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
      .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED]")
      .slice(0, 500);
  return {
    errorCode: input.errorCode,
    errorMessage: input.errorMessage ? strip(input.errorMessage) : undefined,
    readyState: input.readyState,
  };
}
