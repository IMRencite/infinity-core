import type { KeyboardEvent } from "react";

export function handleRoomKeyboardActivate(
  event: KeyboardEvent<HTMLElement>,
  onActivate: () => void,
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export function handleCardKeyboardInspect(
  event: KeyboardEvent<HTMLElement>,
  onInspect: () => void,
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onInspect();
  }
}
