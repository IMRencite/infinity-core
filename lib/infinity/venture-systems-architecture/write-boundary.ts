import { ReadOnlyMutationBlockedError } from "@/lib/infinity/commercialization/probes/mode";
import { BLOCKED_SYSTEM_WRITES, type BlockedSystemWrite } from "./constants";

export const VENTURE_SYSTEMS_WRITE_BOUNDARY = {
  crmWrites: 0,
  emailSends: 0,
  smsSends: 0,
  providerAccountCreations: 0,
  paidSubscriptions: 0,
  cardBankCharges: 0,
  stripeWrites: 0,
  treasuryExternalMovements: 0,
  dnsWrites: 0,
  registrarWrites: 0,
  deploymentWrites: 0,
  eagActions: 0,
  livePurchaseAuthority: false,
  liveProvisioningAuthority: false,
} as const;

function blocked(operation: BlockedSystemWrite): never {
  throw new ReadOnlyMutationBlockedError(operation);
}

export type VentureSystemsWriteAdapter = {
  createCrmAccount(): Promise<never>;
  sendEmail(): Promise<never>;
  sendSms(): Promise<never>;
  createProviderAccount(): Promise<never>;
  purchaseSubscription(): Promise<never>;
  chargeCard(): Promise<never>;
  moveBankFunds(): Promise<never>;
  writeStripe(): Promise<never>;
  writeDns(): Promise<never>;
  writeRegistrar(): Promise<never>;
  deploy(): Promise<never>;
  executeExternalAction(): Promise<never>;
};

export function createBlockedSystemsAdapter(): VentureSystemsWriteAdapter {
  return {
    createCrmAccount: async () => blocked("createCrmAccount"),
    sendEmail: async () => blocked("sendEmail"),
    sendSms: async () => blocked("sendSms"),
    createProviderAccount: async () => blocked("createProviderAccount"),
    purchaseSubscription: async () => blocked("purchaseSubscription"),
    chargeCard: async () => blocked("chargeCard"),
    moveBankFunds: async () => blocked("moveBankFunds"),
    writeStripe: async () => blocked("writeStripe"),
    writeDns: async () => blocked("writeDns"),
    writeRegistrar: async () => blocked("writeRegistrar"),
    deploy: async () => blocked("deploy"),
    executeExternalAction: async () => blocked("executeExternalAction"),
  };
}

export async function assertSystemsWritesBlocked(
  adapter: VentureSystemsWriteAdapter = createBlockedSystemsAdapter(),
): Promise<Record<BlockedSystemWrite, "BLOCKED">> {
  const result = {} as Record<BlockedSystemWrite, "BLOCKED">;
  for (const operation of BLOCKED_SYSTEM_WRITES) {
    try {
      await adapter[operation]();
      throw new Error(`${operation} was not blocked`);
    } catch (error) {
      if (!(error instanceof ReadOnlyMutationBlockedError)) throw error;
      result[operation] = "BLOCKED";
    }
  }
  return result;
}
