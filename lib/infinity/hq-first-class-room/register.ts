import {
  HQ_FIRST_CLASS_ROOM_CONTRACT,
  missingFirstClassRoomFields,
  type HQFirstClassRoomDefinition,
  type HQFirstClassRoomInput,
} from "./contract";

export class HQFirstClassRoomRegistrationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`${HQ_FIRST_CLASS_ROOM_CONTRACT}: incomplete room registration (${missing.join(",")})`);
    this.name = "HQFirstClassRoomRegistrationError";
    this.missing = missing;
  }
}

export function registerFirstClassRoom(input: HQFirstClassRoomInput): HQFirstClassRoomDefinition {
  const missing = missingFirstClassRoomFields(input);
  if (missing.length > 0) {
    throw new HQFirstClassRoomRegistrationError(missing);
  }
  return input as HQFirstClassRoomDefinition;
}
