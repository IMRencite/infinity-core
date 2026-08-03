export const ORCHESTRATOR_FORBIDDEN_ACTIONS = [
  "create_venture",
  "allocate_capital",
  "approve_planning",
  "publish_content",
  "create_website",
  "deploy_code",
  "modify_policy",
  "spawn_autonomous_worker",
] as const;

export type OrchestratorForbiddenAction = (typeof ORCHESTRATOR_FORBIDDEN_ACTIONS)[number];

export type OrchestratorConstraintSet = {
  advisoryOnly: true;
  executiveAuthoritative: true;
  networkAllowed: false;
  providerExecutionAllowed: false;
  forbiddenActions: OrchestratorForbiddenAction[];
};

export class OrchestratorSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestratorSafetyError";
  }
}

export function defaultOrchestratorConstraints(): OrchestratorConstraintSet {
  return {
    advisoryOnly: true,
    executiveAuthoritative: true,
    networkAllowed: false,
    providerExecutionAllowed: false,
    forbiddenActions: [...ORCHESTRATOR_FORBIDDEN_ACTIONS],
  };
}

export function assertOrchestratorActionAllowed(
  action: OrchestratorForbiddenAction,
  executiveAuthorized: boolean,
): void {
  if (!executiveAuthorized) {
    throw new OrchestratorSafetyError(
      `Orchestrator action "${action}" requires Executive authorization.`,
    );
  }
}

export function assertNoNetworkExecution(constraints: OrchestratorConstraintSet): void {
  if (constraints.networkAllowed) {
    throw new OrchestratorSafetyError("Network execution is disabled in Foundation v1.");
  }
}
