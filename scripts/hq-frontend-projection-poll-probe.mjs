const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const pollUrl = `${base}/api/operator-console/favc1-cycle?cycleKey=cycle-1786949554348&ventureId=favc1-cycle%3Acycle-1786949554348`;
const headers = { "x-infinity-hq-live-proof": "1" };

async function poll() {
  const started = Date.now();
  const res = await fetch(pollUrl, { headers, cache: "no-store" });
  const body = await res.json();
  const activity = body.snapshot?.commandActivity;
  return {
    status: res.status,
    ms: Date.now() - started,
    active: activity?.counts?.activeMissions ?? null,
    mission: activity?.nowInspecting?.currentMission ?? null,
    completed: activity?.latestCompleted?.missionType ?? null,
  };
}

const before = await poll();
console.log("before", before);
const start = await fetch(`${base}/api/operator-console/dev/hq-frontend-projection-proof`, {
  method: "POST",
});
console.log("start", start.status, await start.json());
for (let i = 0; i < 8; i += 1) {
  const row = await poll();
  console.log(`poll ${i + 1}`, row);
  if (row.active >= 1) break;
}
