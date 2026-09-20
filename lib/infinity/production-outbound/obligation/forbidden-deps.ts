import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationForbiddenDependencyReachabilityGate(input: {
  organic_growth_role_throws: boolean;
  communication_entrypoint_imports_stub: boolean;
  blog_os_in_dest: boolean;
}): NamedOutboundLoopGate {
  const pass = input.organic_growth_role_throws && !input.communication_entrypoint_imports_stub && !input.blog_os_in_dest;
  return named("CommunicationForbiddenDependencyReachabilityGate", pass ? "PASS" : "FAIL", [
    input.organic_growth_role_throws ? "STUB_THROWS" : "STUB_PLAUSIBLE",
    input.communication_entrypoint_imports_stub ? "REACHABLE" : "UNREACHABLE",
    input.blog_os_in_dest ? "BLOG_OS_PRESENT" : "BLOG_OS_ABSENT",
  ]);
}
