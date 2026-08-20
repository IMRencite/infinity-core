import type { ProviderEnvironment } from "../../constants";
import { unknownAmount, type EpistemicAmount } from "../../types";

export type MercuryReadOperation = "GET_ACCOUNTS" | "GET_ACCOUNT" | "GET_TRANSACTIONS";

export type MercuryReadTelemetry = {
  provider: "mercury";
  operation: MercuryReadOperation;
  httpMethod: "GET";
  costUsd: null;
  costKnown: false;
  cost: EpistemicAmount;
  environment: ProviderEnvironment;
  path: string;
};

export function mercuryUnknownReadCost(
  operation: MercuryReadOperation,
  environment: ProviderEnvironment,
  path: string,
): MercuryReadTelemetry {
  return {
    provider: "mercury",
    operation,
    httpMethod: "GET",
    costUsd: null,
    costKnown: false,
    cost: unknownAmount(),
    environment,
    path,
  };
}
