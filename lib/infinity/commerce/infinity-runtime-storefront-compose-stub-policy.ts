/**
 * Isolated infinity-runtime deploy: when to replace CT storefront compose with a throwing stub.
 * Portfolio VENTURE_DEPLOY requires real compose unless explicit stub test mode is on.
 */
export function shouldInstallIsolatedRuntimeStorefrontComposeStub(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.INFINITY_RUNTIME_COMMERCE_BRIDGE_DEPLOY === "1" && env.INFINITY_RUNTIME_STUB_STOREFRONT_COMPOSE === "1";
}

export function isolatedRuntimeStorefrontComposeForbiddenError(): Error {
  return new Error("FORBIDDEN_STOREFRONT_COMPOSE_IN_ISOLATED_RUNTIME");
}
