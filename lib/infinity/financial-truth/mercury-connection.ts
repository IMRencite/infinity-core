import type { MercuryConnectionState } from "./types";

export function mapMercuryConnection(input: {
  enabled: boolean;
  tokenConfigured: boolean;
  httpStatus?: number | null;
  errorCode?: string | null;
}): MercuryConnectionState {
  if (!input.tokenConfigured || !input.enabled) return "CREDENTIALS_REQUIRED";
  if (input.httpStatus === 403 || input.errorCode === "PERMISSION_REQUIRED") return "PERMISSION_REQUIRED";
  if (input.httpStatus === 401 || input.errorCode === "AUTH_FAILED") return "FAIL";
  if (input.errorCode === "APPROVAL_PENDING") return "APPROVAL_PENDING";
  if (input.httpStatus && input.httpStatus >= 400) return "FAIL";
  return "LIVE";
}
