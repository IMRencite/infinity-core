import type { Gate } from "../types";

export const PRERENDER_HOOK_BOUNDARY_GATE = "PrerenderHookBoundaryGate" as const;

export const PRERENDER_CLIENT_HOOKS = [
  "useOptimistic",
  "useState",
  "useEffect",
  "useReducer",
  "useTransition",
  "useRef",
  "useContext",
  "useLayoutEffect",
  "useFormStatus",
  "useFormState",
  "useActionState",
] as const;

const HOOK_RE = new RegExp(`\\b(${PRERENDER_CLIENT_HOOKS.join("|")})\\b`);
const BROWSER_ACCESS_RE =
  /\bwindow\.(document|location|localStorage|sessionStorage)\b|\bdocument\.(querySelector|getElementById|cookie|body|referrer)\b|\blocalStorage\.(getItem|setItem)\b/;
const EVENT_HANDLER_RE =
  /\bon(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|Input|PointerDown|PointerUp|MouseDown|MouseUp|TouchStart)\s*=/;
const ISOMORPHIC_WINDOW_GUARD_RE =
  /typeof\s+window\s*===\s*["']undefined["']|typeof\s+window\s*!==\s*["']undefined["']|typeof\s+document\s*===\s*["']undefined["']/;

export const FOUNDER_PRERENDER_USEOPTIMISTIC_NO_CLIENT_FIXTURE = {
  files: [
    {
      path: "app/pricing/page.tsx",
      content: `import { PricingInterest } from "../../components/pricing-interest";
export default function Page() {
  return <PricingInterest />;
}
`,
    },
    {
      path: "components/pricing-interest.tsx",
      content: `import { useOptimistic } from "react";
export function PricingInterest() {
  const [state] = useOptimistic("idle");
  return <p>{state}</p>;
}
`,
    },
  ],
} as const;

export const FOUNDER_PRERENDER_USEOPTIMISTIC_CLIENT_BOUNDARY_FIXTURE = {
  files: [
    {
      path: "app/pricing/page.tsx",
      content: `import { PricingInterest } from "../../components/pricing-interest";
export default function Page() {
  return (
    <section>
      <h1>Early validation pricing hypotheses</h1>
      <PricingInterest />
    </section>
  );
}
`,
    },
    {
      path: "components/pricing-interest.tsx",
      content: `"use client";
import { useOptimistic } from "react";
export function PricingInterest() {
  const [state] = useOptimistic("idle");
  return <p>{state}</p>;
}
`,
    },
  ],
} as const;

export type PrerenderHookFinding = {
  path: string;
  hook: string;
  reason: "missing_use_client" | "browser_api_without_client";
};

export type PrerenderHookBoundaryGateResult = {
  gate: typeof PRERENDER_HOOK_BOUNDARY_GATE;
  overall: Gate;
  findings: PrerenderHookFinding[];
  serverPages: number;
  clientModules: number;
};

export function hasUseClientDirective(content: string): boolean {
  return /^\s*["']use client["']\s*;?/m.test(content);
}

export function hasIsomorphicBrowserGuard(content: string): boolean {
  return ISOMORPHIC_WINDOW_GUARD_RE.test(content);
}

export function fileNeedsClientBoundary(content: string): boolean {
  if (HOOK_RE.test(content) || EVENT_HANDLER_RE.test(content)) return true;
  return BROWSER_ACCESS_RE.test(content) && !hasIsomorphicBrowserGuard(content);
}

export function stripUnnecessaryUseClient(content: string): string {
  if (!hasUseClientDirective(content)) return content;
  if (fileNeedsClientBoundary(content)) return content;
  return content.replace(/^\s*["']use client["']\s*;?\s*\r?\n/, "");
}

export function evaluatePrerenderHookBoundaryGate(
  files: Array<{ path: string; content: string }>,
): PrerenderHookBoundaryGateResult {
  const findings: PrerenderHookFinding[] = [];
  let serverPages = 0;
  let clientModules = 0;
  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    const client = hasUseClientDirective(file.content);
    if (client) clientModules += 1;
    if (/\/page\.(tsx|jsx|js)$/.test(path) && !client) serverPages += 1;
    if (client) continue;
    const hooks = file.content.match(new RegExp(HOOK_RE, "g")) ?? [];
    for (const hook of [...new Set(hooks)]) {
      findings.push({ path, hook, reason: "missing_use_client" });
    }
    if (EVENT_HANDLER_RE.test(file.content) && /app\/|components\//.test(path)) {
      findings.push({ path, hook: "event_handler", reason: "missing_use_client" });
    }
    if (
      hooks.length === 0 &&
      BROWSER_ACCESS_RE.test(file.content) &&
      !hasIsomorphicBrowserGuard(file.content) &&
      /app\/|components\//.test(path)
    ) {
      findings.push({ path, hook: "browser_api", reason: "browser_api_without_client" });
    }
  }
  return {
    gate: PRERENDER_HOOK_BOUNDARY_GATE,
    overall: findings.length === 0 ? "PASS" : "FAIL",
    findings,
    serverPages,
    clientModules,
  };
}
