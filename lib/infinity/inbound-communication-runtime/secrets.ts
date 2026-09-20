export function secretLike(serialized: string): boolean {
  return /ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(serialized);
}

export function assertNoSecrets(value: unknown): void {
  if (secretLike(JSON.stringify(value))) {
    throw new Error("Secret-like content blocked from inbound communication persistence");
  }
}
