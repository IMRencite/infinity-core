import type { MemoryScope } from "./types";

export type MemoryRecord = {
  id: string;
  organizationId: string;
  scope: MemoryScope;
  subjectType: string;
  subjectId: string;
  label: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryQuery = {
  organizationId: string;
  scope?: MemoryScope;
  subjectType?: string;
  subjectId?: string;
};

/** In-memory memory store — no vectors, embeddings, or AI. */
export type ReasoningMemoryStore = {
  put(record: MemoryRecord): MemoryRecord;
  get(id: string): MemoryRecord | null;
  query(query: MemoryQuery): MemoryRecord[];
};

export function createInMemoryMemoryStore(): ReasoningMemoryStore {
  const records = new Map<string, MemoryRecord>();

  return {
    put(record) {
      records.set(record.id, record);
      return record;
    },
    get(id) {
      return records.get(id) ?? null;
    },
    query(query) {
      return [...records.values()].filter((record) => {
        if (record.organizationId !== query.organizationId) return false;
        if (query.scope && record.scope !== query.scope) return false;
        if (query.subjectType && record.subjectType !== query.subjectType) return false;
        if (query.subjectId && record.subjectId !== query.subjectId) return false;
        return true;
      });
    },
  };
}

export function createMemoryRecord(input: {
  organizationId: string;
  scope: MemoryScope;
  subjectType: string;
  subjectId: string;
  label: string;
  content: string;
}): MemoryRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    scope: input.scope,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    label: input.label,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
}
