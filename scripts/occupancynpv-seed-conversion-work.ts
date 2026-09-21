import { ensureOccupancyNpvCanonicalWork, selectTopCanonicalWork } from "../lib/infinity/canonical-work";

ensureOccupancyNpvCanonicalWork();
const current = selectTopCanonicalWork();
console.log(JSON.stringify({
  work_id: current?.work_id ?? null,
  title: current?.title ?? null,
  status: current?.status ?? null,
  rooms: current?.assigned_rooms ?? [],
}, null, 2));
