export function workspaceUnavailablePath(code: string | null): string {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  const query = params.toString();
  return query
    ? `/dashboard/workspace-unavailable?${query}`
    : "/dashboard/workspace-unavailable";
}
