export type AgentMemoryRecord = {
  id: string;
  organizationId: string;
  agentId: string;
  runId: string;
  label: string;
  content: string;
  createdAt: string;
};

export type AgentMemoryStore = {
  put(record: AgentMemoryRecord): AgentMemoryRecord;
  listByRun(runId: string): AgentMemoryRecord[];
  clear(): void;
};

export function createInMemoryAgentMemoryStore(): AgentMemoryStore {
  const records: AgentMemoryRecord[] = [];

  return {
    put(record) {
      records.push(record);
      return record;
    },
    listByRun(runId) {
      return records.filter((record) => record.runId === runId);
    },
    clear() {
      records.length = 0;
    },
  };
}

export function createAgentMemoryRecord(input: {
  organizationId: string;
  agentId: string;
  runId: string;
  label: string;
  content: string;
}): AgentMemoryRecord {
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    agentId: input.agentId,
    runId: input.runId,
    label: input.label,
    content: input.content,
    createdAt: new Date().toISOString(),
  };
}
