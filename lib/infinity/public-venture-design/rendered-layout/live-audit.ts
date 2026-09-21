import { auditRenderedLayoutQuality } from "./geometry";
import type { RenderedLayoutQualityResult } from "./types";

const DEFAULT_LIVE_ORIGIN = "https://infinity-validation-cre-lease-npv-e72beb7b-5le6m8tl1.vercel.app";

const AUDIT_ROUTES = [
  "/",
  "/how-it-works",
  "/commercial-lease-npv",
  "/resources/free-rent/",
  "/resources",
  "/pricing",
  "/early-access",
] as const;

export async function auditLiveRenderedLayout(input?: {
  origin?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  origin: string;
  mutated: false;
  routes: typeof AUDIT_ROUTES;
  result: RenderedLayoutQualityResult;
  fetched: Record<string, { status: number; bytes: number }>;
}> {
  const origin = input?.origin ?? DEFAULT_LIVE_ORIGIN;
  const fetchImpl = input?.fetchImpl ?? fetch;
  const fetched: Record<string, { status: number; bytes: number }> = {};
  const pages: Array<{ route: string; html: string }> = [];
  let css = "";
  for (const route of AUDIT_ROUTES) {
    const url = `${origin}${route}`;
    const response = await fetchImpl(url, { method: "GET" });
    const html = await response.text();
    fetched[route] = { status: response.status, bytes: html.length };
    pages.push({ route: route.replace(/\/$/, "") || "/", html });
    if (!css) {
      const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)].map((match) => match[1]);
      const extra = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)].map((match) => match[1]);
      for (const href of [...hrefs, ...extra]) {
        const cssUrl = href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
        const cssResponse = await fetchImpl(cssUrl, { method: "GET" });
        if (cssResponse.ok) {
          css += `\n${await cssResponse.text()}`;
          fetched[href] = { status: cssResponse.status, bytes: css.length };
        }
      }
    }
  }
  return {
    origin,
    mutated: false,
    routes: AUDIT_ROUTES,
    result: auditRenderedLayoutQuality({ css, pages, footerHtml: pages.map((page) => page.html).join("\n") }),
    fetched,
  };
}
