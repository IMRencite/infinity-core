export type AskReviewAccountStatus = "ACTIVE" | "DISABLED";
export type AskReviewLocationStatus = "ACTIVE" | "ARCHIVED";

export type AskReviewAccount = {
  accountId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  status: AskReviewAccountStatus;
  qaAccess: boolean;
};

export type AskReviewLocation = {
  locationId: string;
  accountId: string;
  name: string;
  placeId: string | null;
  mapsUrl: string | null;
  reviewUrl: string | null;
  status: AskReviewLocationStatus;
  createdAt: string;
  updatedAt: string;
};

export type AskReviewRequestCopy = {
  counter: string;
  sms: string;
  email: string;
};

export type AskReviewKit = {
  kitId: string;
  locationId: string;
  accountId: string;
  reviewUrl: string;
  requestCopy: string;
  copyVariants: AskReviewRequestCopy;
  qrSvg: string;
  createdAt: string;
};

export type AskReviewSession = {
  sessionId: string;
  accountId: string;
  createdAt: string;
};

export type AskReviewEvent = {
  eventId: string;
  type: string;
  accountId: string | null;
  locationId: string | null;
  outcome: string;
  createdAt: string;
};

export type AskReviewStore = {
  accounts: AskReviewAccount[];
  locations: AskReviewLocation[];
  kits: AskReviewKit[];
  sessions: AskReviewSession[];
  events: AskReviewEvent[];
};

export type AskReviewLocationInputError = "INVALID_LOCATION_INPUT" | "UNSUPPORTED_MAPS_URL";

export const ASKREVIEW_JSON_STORE_CLASSIFICATION = "VALIDATION_ONLY" as const;
export const ASKREVIEW_FOUNDER_QA_EMAIL = "infinitemediaresources@gmail.com" as const;
export const ASKREVIEW_KIT_HISTORY_LIMIT = 10 as const;
export const ASKREVIEW_PASSWORD_RESET_POLICY = "SUPPORT_EMAIL_ONLY_V1" as const;
