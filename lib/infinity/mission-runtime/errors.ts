export class MissionRuntimeStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissionRuntimeStateError";
  }
}
