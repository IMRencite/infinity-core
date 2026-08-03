export class VentureFactoryError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "VentureFactoryError";
    this.code = code;
  }
}
