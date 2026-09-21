export const ASKREVIEW_SESSION_COOKIE = "askreview_session" as const;

export function askReviewCookieHeader(sessionId: string, production = process.env.NODE_ENV === "production"): string {
  const secure = production ? "; Secure" : "";
  return `${ASKREVIEW_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}

export function clearAskReviewCookieHeader(production = process.env.NODE_ENV === "production"): string {
  const secure = production ? "; Secure" : "";
  return `${ASKREVIEW_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
