import type {
  HqCommandOversightProjection,
  HqCommandOversightState,
  HqInfinitySymbolState,
  WorkerVisualInput,
} from "./contract";
import { countWorkerVisuals } from "./workers";

export function infinityStateForCommand(commandState: HqCommandOversightState): HqInfinitySymbolState {
  switch (commandState) {
    case "ACTIVE_OVERSIGHT":
      return "ACTIVE";
    case "WAITING":
    case "WAITING_FOR_EVIDENCE":
      return "STANDBY";
    case "BLOCKED":
      return "BLOCKED";
    case "AUTHORIZATION_REQUIRED":
      return "AUTHORIZATION";
    case "IDLE":
      return "IDLE";
  }
}

export function commandAccessibleState(commandState: HqCommandOversightState): string {
  switch (commandState) {
    case "ACTIVE_OVERSIGHT":
      return "Command overseeing live canonical execution";
    case "WAITING_FOR_EVIDENCE":
      return "Command waiting for evidence";
    case "WAITING":
      return "Command waiting; no worker executing";
    case "BLOCKED":
      return "Command blocked";
    case "AUTHORIZATION_REQUIRED":
      return "Command requires authorization";
    case "IDLE":
      return "Command idle";
  }
}

export function projectCommandOversight(input: {
  workers: WorkerVisualInput[];
  systemState?: string | null;
  waitingWork?: boolean;
  canonicalActiveWork?: boolean;
}): HqCommandOversightProjection {
  const counts = countWorkerVisuals(input.workers);
  const waitingWork = Boolean(input.waitingWork) || counts.WAITING > 0 || input.systemState === "WAITING_FOR_EVIDENCE";
  let commandState: HqCommandOversightState = "IDLE";
  if (counts.ACTIVE > 0 || input.canonicalActiveWork) commandState = "ACTIVE_OVERSIGHT";
  else if (counts.AUTHORIZATION_REQUIRED > 0 || input.systemState === "AUTHORIZATION_REQUIRED") {
    commandState = "AUTHORIZATION_REQUIRED";
  } else if (counts.BLOCKED > 0 || input.systemState === "BLOCKED") {
    commandState = "BLOCKED";
  } else if (input.systemState === "WAITING_FOR_EVIDENCE") {
    commandState = "WAITING_FOR_EVIDENCE";
  } else if (waitingWork) {
    commandState = "WAITING";
  }
  return {
    commandState,
    infinityState: infinityStateForCommand(commandState),
    accessibleState: commandAccessibleState(commandState),
    activeWorkerCount: counts.ACTIVE,
    waitingWorkerCount: counts.WAITING,
    blockedWorkerCount: counts.BLOCKED,
    authorizationWorkerCount: counts.AUTHORIZATION_REQUIRED,
  };
}
