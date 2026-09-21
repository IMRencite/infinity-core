import type { AcquisitionChannelType, AuthorizationClass } from "./constants";

export function classifyAuthorization(input: {
  channelType: AcquisitionChannelType;
  sendingMessages: boolean;
  paid: boolean;
  providerWrite: boolean;
}): AuthorizationClass {
  if (input.paid || input.channelType === "paid_acquisition") return "PAID_ACQUISITION";
  if (input.providerWrite) return "PROVIDER_MUTATION";
  if (input.sendingMessages) return "EXTERNAL_COMMUNICATION";
  if (input.channelType === "community_post" || input.channelType === "professional_social_post") return "PUBLICATION";
  return "READ_ONLY_RESEARCH";
}

export function mayAutoExecute(input: {
  authorizationClass: AuthorizationClass;
  capabilityAvailable: boolean;
  authorizationExists: boolean;
  scopeBounded: boolean;
}): boolean {
  if (!input.capabilityAvailable || !input.scopeBounded) return false;
  if (input.authorizationClass === "READ_ONLY_RESEARCH" || input.authorizationClass === "INTERNAL_GENERATION") {
    return true;
  }
  return input.authorizationExists;
}

export function communicationsAuthorizationGranted(): false {
  return false;
}

export function paidAcquisitionAuthorizationGranted(): false {
  return false;
}
