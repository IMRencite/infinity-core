export type CredentialReference = {
  credentialReference: string;
  provider: string;
  scope: string;
  organizationId: string;
  permissions: string[];
  status: "mock" | "missing" | "valid" | "revoked";
};

export type CredentialResolver = {
  resolve(reference: string, organizationId: string): Promise<CredentialReference | null>;
};

export class MockCredentialResolver implements CredentialResolver {
  async resolve(reference: string, organizationId: string): Promise<CredentialReference | null> {
    if (!reference.startsWith("mock://")) {
      return {
        credentialReference: reference,
        provider: "unknown",
        scope: "unknown",
        organizationId,
        permissions: [],
        status: "missing",
      };
    }
    return {
      credentialReference: reference,
      provider: reference.split("/")[2] ?? "mock",
      scope: "simulation",
      organizationId,
      permissions: ["simulate"],
      status: "mock",
    };
  }
}

export const defaultCredentialResolver = new MockCredentialResolver();

export function credentialRequirementForScope(scope: string | null): Record<string, unknown> {
  if (!scope) {
    return { required: false };
  }
  return {
    required: true,
    credential_reference: `mock://${scope}/e2e`,
    note: "Mock reference only — no secret persisted",
  };
}
