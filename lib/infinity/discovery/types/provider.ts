export type DiscoveryRawItem = {
  externalId: string;
  title: string;
  description: string;
  url: string;
  category?: string;
  market?: string;
  keywords?: string[];
  publishedAt?: string;
  payload: Record<string, unknown>;
};

export type DiscoveryFetchContext = {
  organizationId: string;
  scanId: string;
  limit?: number;
  config?: Record<string, unknown>;
};

export type DiscoverySourceProvider = {
  id: string;
  name: string;
  sourceKey: string;
  version: string;
  fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]>;
};

export type DiscoveryProviderFetchResult = {
  providerId: string;
  items: DiscoveryRawItem[];
  fetchedAt: string;
  liveNetworkUsed: boolean;
};
