export type OrganicTickBusinessResult = "PASS" | "PASS_IDLE" | "BLOCKED_HOLD" | "FAIL";

export type OrganicPersistFailure = {
  stage: string;
  code: string | null;
  message: string;
};

export class OrganicPersistError extends Error {
  readonly stage: string;
  readonly code: string | null;
  constructor(input: OrganicPersistFailure) {
    super(input.message);
    this.name = "OrganicPersistError";
    this.stage = input.stage;
    this.code = input.code;
  }
  toSafe(): OrganicPersistFailure {
    return { stage: this.stage, code: this.code, message: this.message.slice(0, 240) };
  }
}

export function safePersistFailure(error: unknown, stage: string): OrganicPersistFailure {
  if (error instanceof OrganicPersistError) return error.toSafe();
  if (error && typeof error === "object") {
    const record = error as { code?: string; message?: string };
    return {
      stage,
      code: record.code ?? null,
      message: String(record.message ?? "persist_failed").slice(0, 240),
    };
  }
  return { stage, code: null, message: String(error ?? "persist_failed").slice(0, 240) };
}

export function classifyOrganicTickBusinessResult(input: {
  persistFailed: boolean;
  publishingHold: string | null | undefined;
  workAdvanced?: boolean;
}): OrganicTickBusinessResult {
  if (input.persistFailed) return "FAIL";
  if (input.publishingHold) return "BLOCKED_HOLD";
  if (input.workAdvanced === false) return "PASS_IDLE";
  return "PASS";
}

export function assembleOrganicTickReport(input: {
  persistSchedulerError: OrganicPersistFailure | null;
  persistDurableError?: OrganicPersistFailure | null;
  durableLastTick: string | null;
  inMemoryLastTick: string | null;
  publishingHold: string | null | undefined;
  workAdvanced?: boolean;
}): {
  business_execution: OrganicTickBusinessResult;
  last_tick_at: string | null;
  last_tick_advanced: boolean;
  error_surfaced: boolean;
  public_mutation: "NO";
  failure: OrganicPersistFailure | null;
} {
  const failure = input.persistSchedulerError ?? input.persistDurableError ?? null;
  const persistFailed = Boolean(failure);
  return {
    business_execution: classifyOrganicTickBusinessResult({
      persistFailed,
      publishingHold: input.publishingHold,
      workAdvanced: input.workAdvanced,
    }),
    last_tick_at: persistFailed ? input.durableLastTick : input.inMemoryLastTick,
    last_tick_advanced: !persistFailed && Boolean(input.inMemoryLastTick) && input.inMemoryLastTick !== input.durableLastTick,
    error_surfaced: persistFailed,
    public_mutation: "NO",
    failure,
  };
}

export function assertOrganicPersistWrite(input: {
  error: { code?: string; message?: string } | null | undefined;
  rowCount?: number | null;
  stage: string;
}): void {
  if (input.error) {
    throw new OrganicPersistError({
      stage: input.stage,
      code: input.error.code ?? null,
      message: String(input.error.message ?? "persist_failed").slice(0, 240),
    });
  }
  if (input.rowCount === 0) {
    throw new OrganicPersistError({
      stage: input.stage,
      code: "ROW_MISSING",
      message: "scheduler state row was not updated",
    });
  }
}
