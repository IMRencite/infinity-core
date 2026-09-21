import { createOccupancynpvProductStore, type OccupancynpvProductStore } from "./store";

let store: OccupancynpvProductStore | null = null;

export function getOccupancynpvProductStore(): OccupancynpvProductStore {
  if (!store) store = createOccupancynpvProductStore();
  return store;
}

export function resetOccupancynpvProductStore(): void {
  store = createOccupancynpvProductStore();
}
