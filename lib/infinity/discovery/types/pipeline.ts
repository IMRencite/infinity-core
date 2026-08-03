export * from "./opportunity";
export * from "./provider";

export type DiscoveryPipelineContext = {
  organizationId: string;
  scanId: string;
  correlationId?: string | null;
  engineJobId?: string | null;
  workerRunId?: string | null;
  providerIds?: string[];
  manualItems?: import("./provider").DiscoveryRawItem[];
  maxItemsPerProvider?: number;
};

export type DiscoveryPipelineResult = {
  providersRun: number;
  fetchedCount: number;
  normalizedCount: number;
  dedupedCount: number;
  persistedCount: number;
  skippedDuplicateCount: number;
  opportunityIds: string[];
  eventsEmitted: number;
};
