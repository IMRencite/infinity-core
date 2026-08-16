const counters: Record<string, number> = {};

export function incrementProviderMetric(name: string, delta = 1): void {
  counters[name] = (counters[name] ?? 0) + delta;
}

export function getProviderMetricsSnapshot(): Record<string, number> {
  return { ...counters };
}

export function resetProviderMetricsForTests(): void {
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
}
