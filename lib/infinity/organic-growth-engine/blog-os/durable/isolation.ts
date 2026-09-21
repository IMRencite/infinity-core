import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CheckResult } from "./types";

export function evaluateReleaseIsolationCheck(input: {
  blog_os_typecheck: "PASS" | "FAIL";
  blog_os_build?: "PASS" | "FAIL" | "NOT_RUN";
  communication_isolated: "PASS" | "FAIL";
  communication_isolated_build?: "PASS" | "FAIL" | "NOT_RUN";
  shared_contract: "PASS" | "FAIL";
  blog_imports_communication_runtime?: boolean;
  communication_imports_blog_os_store?: boolean;
}): CheckResult {
  const reasons: string[] = [];
  if (input.blog_os_typecheck !== "PASS") reasons.push("BLOG_OS_TYPECHECK");
  if (input.communication_isolated !== "PASS") reasons.push("COMMUNICATION_ISOLATED");
  if (input.shared_contract !== "PASS") reasons.push("SHARED_CONTRACT");
  if (input.blog_imports_communication_runtime) reasons.push("BLOG_IMPORTS_COMMUNICATION_RUNTIME");
  if (input.communication_imports_blog_os_store) reasons.push("COMMUNICATION_IMPORTS_BLOG_OS_STORE");
  if (reasons.length) {
    return { check: "ReleaseIsolationCheck", result: "FAIL", reasons };
  }
  if (input.blog_os_build !== "PASS" || input.communication_isolated_build !== "PASS") {
    return {
      check: "ReleaseIsolationCheck",
      result: "NOT_PROVEN",
      reasons: ["ACTUAL_BUILDS_REQUIRED"],
    };
  }
  return {
    check: "ReleaseIsolationCheck",
    result: "PASS",
    reasons: ["ISOLATED"],
  };
}

export function inspectReleaseIsolationSource(root = process.cwd()): {
  blog_imports_communication_runtime: boolean;
  communication_imports_blog_os_store: boolean;
  isolation_stubbed: boolean;
} {
  const durable = readFileSync(join(root, "lib/infinity/organic-growth-engine/blog-os/durable/store.ts"), "utf8");
  const isolation = readFileSync(join(root, "lib/infinity/production-outbound/obligation/isolation.ts"), "utf8");
  return {
    blog_imports_communication_runtime: /production-outbound\/communication-runtime/.test(durable),
    communication_imports_blog_os_store: /organic-growth-engine\/blog-os\/store/.test(isolation),
    isolation_stubbed: /communication-runtime-no-blog-os-store/.test(isolation),
  };
}
