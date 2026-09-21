export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VITEST) return;
  const { startCreInboundObserverIfActivated } = await import(
    "@/lib/infinity/inbound-communication-runtime/cre-inbound-observer-loop"
  );
  startCreInboundObserverIfActivated();
}

export async function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
  context: { routePath?: string },
): Promise<void> {
  if (process.env.VITEST) return;
  const { logHqProductionError, classifyHqSafeErrorClass } = await import(
    "@/lib/infinity/hq-production-deployment/error-correlation"
  );
  const route = context.routePath ?? request.path;
  if (!route.startsWith("/dashboard") && !route.startsWith("/api/operator-console") && !route.startsWith("/api/hq")) {
    return;
  }
  logHqProductionError({
    route,
    error_class: classifyHqSafeErrorClass(error),
    stage: "operator_console_render",
    safe_digest: error.digest ?? null,
  });
}
