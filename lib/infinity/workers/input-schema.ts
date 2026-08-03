import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(",")}}`;
}

export function hashWorkerInput(input: Json): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

export function buildWorkerExecutionKey(input: {
  organizationId: string;
  missionId: string | null;
  planId: string | null;
  planStepId: string | null;
  capabilityKey: string;
  capabilityVersion: string;
  inputHash: string;
}): string {
  return [
    input.organizationId,
    input.missionId ?? "none",
    input.planId ?? "none",
    input.planStepId ?? "none",
    input.capabilityKey,
    input.capabilityVersion,
    input.inputHash,
  ].join(":");
}

export function normalizeWorkerInput(input: Json): Record<string, unknown> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return { value: input };
}

export function requireStringField(
  input: Record<string, unknown>,
  field: string,
): string {
  const value = input[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required input field: ${field}`);
  }
  return value;
}

export function requireStringArrayField(
  input: Record<string, unknown>,
  field: string,
): string[] {
  const value = input[field];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`Missing required string array field: ${field}`);
  }
  return value as string[];
}
