import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";

async function main() {
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  const token = process.env.VERCEL_TOKEN?.trim() ?? "";
  const team = process.env.VERCEL_TEAM_ID?.trim() ?? "";
  const id = process.argv[2] ?? "dpl_H7pAU7ttHKqnjfVxtwPpkVT58EGi";
  const q = team ? `?teamId=${encodeURIComponent(team)}` : "";
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const dep = await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}${q}`, { headers });
  const json = await dep.json() as Record<string, unknown>;
  const eventsRes = await fetch(`https://api.vercel.com/v3/deployments/${encodeURIComponent(id)}/events${q}`, { headers });
  const events = await eventsRes.json().catch(() => []);
  const rows = Array.isArray(events) ? events : Array.isArray((events as { events?: unknown }).events) ? (events as { events: unknown[] }).events : [];
  const texts = rows
    .map((row) => {
      const rec = row && typeof row === "object" ? row as Record<string, unknown> : {};
      const payload = rec.payload && typeof rec.payload === "object" ? rec.payload as Record<string, unknown> : {};
      return String(rec.text ?? payload.text ?? payload.info ?? rec.type ?? "");
    })
    .filter((text) => /error|fail|Type|Cannot|Module|digest|import/i.test(text))
    .slice(-30);
  console.log(JSON.stringify({
    status: dep.status,
    readyState: json.readyState,
    errorCode: (json.error as { code?: string } | undefined)?.code ?? json.errorCode ?? null,
    errorMessage: typeof json.errorMessage === "string" ? json.errorMessage.slice(0, 400) : null,
    eventHits: texts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
