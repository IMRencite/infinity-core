import type { CloudRuntimeStateStore } from "./store";

export function acquireCloudRuntimeLease(
  store: CloudRuntimeStateStore,
  input: { holder: string; instance_id: string; now: string; seconds?: number },
) {
  return store.claimLease(input);
}

export function releaseCloudRuntimeLease(store: CloudRuntimeStateStore, holder: string): Promise<void> {
  return store.releaseLease(holder);
}

export function expiredLeaseIsRecoverable(input: {
  expires_at: string;
  now: string;
}): boolean {
  return Date.parse(input.expires_at) <= Date.parse(input.now);
}
