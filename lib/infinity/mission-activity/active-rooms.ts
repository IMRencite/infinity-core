import type { CommandActivityView } from "./types";

export function activeRoomLabelsFromRooms(rooms: CommandActivityView["rooms"]): string[] {
  return [...new Set(
    Object.values(rooms)
      .filter((slice) => slice.status === "ACTIVE_WORK")
      .map((slice) => slice.roomLabel)
      .filter(Boolean),
  )];
}

export function activeRoomLabelsFromView(view: CommandActivityView | null | undefined): string[] {
  if (!view?.rooms && !view?.nowInspecting) return [];
  const listed = view.nowInspecting?.currentRooms?.filter(Boolean) ?? [];
  if (listed.length) return [...new Set(listed)];
  return view.rooms ? activeRoomLabelsFromRooms(view.rooms) : [];
}

export function withCurrentRooms(view: CommandActivityView): CommandActivityView {
  return {
    ...view,
    nowInspecting: {
      ...view.nowInspecting,
      currentRooms: activeRoomLabelsFromRooms(view.rooms),
    },
  };
}
