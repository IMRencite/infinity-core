import {
  GMAIL_OAUTH_APPLICATION_TYPE,
  GMAIL_OAUTH_CLIENT_ID_ENV,
  GMAIL_OAUTH_CLIENT_SECRET_ENV,
  GMAIL_OAUTH_PLAYGROUND_REDIRECT_URI,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_REQUIRED_SCOPES,
  GMAIL_SENDER_EMAIL_ENV,
  GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV,
  GMAIL_WRITE_VERIFICATION_MAILBOX_ENV,
} from "./constants";

export const FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED = "FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED" as const;

export const GMAIL_FOUNDER_SETUP_STEPS = [
  "Create or reuse an IMR/Infinity-controlled Google Cloud project. Do not use a CRE prospect account.",
  "Enable only the Gmail API. Do not enable Drive, Calendar, Contacts, or Admin SDK.",
  "Configure the OAuth consent screen for that organization. Add only the three required scopes: gmail.send, gmail.readonly, and userinfo.email.",
  `Create an OAuth client of type ${GMAIL_OAUTH_APPLICATION_TYPE}.`,
  `Add authorized redirect URI ${GMAIL_OAUTH_PLAYGROUND_REDIRECT_URI} so a one-time refresh token can be issued. Infinity does not consume a redirect environment variable at runtime.`,
  "Authorize the IMR/Infinity-controlled Google Workspace or Gmail user for the three required scopes: gmail.send, gmail.readonly, and userinfo.email.",
  "Use Google OAuth 2.0 Playground with the project's own client ID and client secret to authorize all three required scopes and exchange an authorization code for a refresh token. Do not paste that token into Cursor chat.",
  `Store ${GMAIL_OAUTH_CLIENT_ID_ENV} in server-side .env.local. This identifies the OAuth client.`,
  `Store ${GMAIL_OAUTH_CLIENT_SECRET_ENV} in server-side .env.local. This is a secret.`,
  `Store ${GMAIL_OAUTH_REFRESH_TOKEN_ENV} in server-side .env.local. This is a secret.`,
  `Optionally store ${GMAIL_SENDER_EMAIL_ENV} as the expected sender. It must match the authenticated Google identity.`,
  `Optionally store ${GMAIL_WRITE_VERIFICATION_MAILBOX_ENV} and set ${GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV}=true only for a later controlled write to an Infinity/IMR mailbox. Do not set a CRE prospect address.`,
  "Restart the local Infinity server so it reloads .env.local. Do not commit .env.local.",
] as const;

export function gmailFounderSetupContract() {
  return {
    requiredEnvNames: [GMAIL_OAUTH_CLIENT_ID_ENV, GMAIL_OAUTH_CLIENT_SECRET_ENV, GMAIL_OAUTH_REFRESH_TOKEN_ENV],
    optionalEnvNames: [
      GMAIL_SENDER_EMAIL_ENV,
      GMAIL_WRITE_VERIFICATION_MAILBOX_ENV,
      GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV,
    ],
    secretEnvNames: [GMAIL_OAUTH_CLIENT_SECRET_ENV, GMAIL_OAUTH_REFRESH_TOKEN_ENV],
    oauthApplicationType: GMAIL_OAUTH_APPLICATION_TYPE,
    requiredRedirectUri: GMAIL_OAUTH_PLAYGROUND_REDIRECT_URI,
    requiredScopes: GMAIL_REQUIRED_SCOPES,
    additionalGoogleApis: [] as const,
    gmailApiRequired: true,
    storage: ".env.local server-side only. Never NEXT_PUBLIC_, Cursor chat, logs, or git.",
    restart: "Restart the Next.js / Infinity local server after saving .env.local.",
    steps: GMAIL_FOUNDER_SETUP_STEPS,
  };
}
