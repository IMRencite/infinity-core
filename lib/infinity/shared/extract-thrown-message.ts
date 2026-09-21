export function extractThrownMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : null;
    const message = typeof record.message === "string" ? record.message : null;
    const details = typeof record.details === "string" ? record.details : null;
    const hint = typeof record.hint === "string" ? record.hint : null;
    if (message) {
      const parts = [code ? `[${code}]` : null, message, details ? `details=${details}` : null, hint ? `hint=${hint}` : null]
        .filter(Boolean)
        .join(" ");
      return parts;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown failure";
    }
  }
  return "Unknown failure";
}

export function extractThrownCode(error: unknown): string | null {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  if (error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}
