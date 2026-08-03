import { getWorkerCapabilityContract } from "./capability";

export {
  WORKER_CAPABILITY_REGISTRY,
  getWorkerCapabilityContract,
  isGovernedWorkerCapabilityKey,
  assertSideEffectAllowed,
} from "./capability";

export function resolveRegisteredCapabilityVersion(
  capabilityKey: string,
  resolvedVersion: string | null,
): string {
  const contract = getWorkerCapabilityContract(capabilityKey);
  if (!contract) {
    throw new Error(`Capability ${capabilityKey} is not registered in worker foundation`);
  }
  if (resolvedVersion && resolvedVersion !== contract.version) {
    throw new Error(
      `Capability version mismatch: job resolved ${resolvedVersion}, contract ${contract.version}`,
    );
  }
  return contract.version;
}
