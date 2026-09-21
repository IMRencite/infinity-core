export function normalizeRepoPath(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

export function repoPathsEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  return normalizeRepoPath(left) === normalizeRepoPath(right);
}
