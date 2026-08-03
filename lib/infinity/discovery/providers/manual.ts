import type { DiscoveryFetchContext, DiscoveryRawItem, DiscoverySourceProvider } from "../types/provider";

export const manualDiscoveryProvider: DiscoverySourceProvider = {
  id: "manual",
  name: "Manual Provider",
  sourceKey: "discovery.manual",
  version: "1.0.0",
  async fetch(context: DiscoveryFetchContext): Promise<DiscoveryRawItem[]> {
    const items =
      (context.config?.items as DiscoveryRawItem[] | undefined) ??
      (context.config?.manualItems as DiscoveryRawItem[] | undefined) ??
      [];

    const limit = context.limit ?? items.length;
    return items.slice(0, limit);
  },
};
