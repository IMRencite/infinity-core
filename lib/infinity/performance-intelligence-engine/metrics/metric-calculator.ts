export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export function calculateCtr(clicks: number, impressions: number): number | null {
  return safeRatio(clicks, impressions);
}

export function calculateConversionRate(conversions: number, sessions: number): number | null {
  return safeRatio(conversions, sessions);
}

export function calculateCac(acquisitionSpend: number, newCustomers: number): number | null {
  return safeRatio(acquisitionSpend, newCustomers);
}

export function calculateRoas(attributedRevenue: number, adSpend: number): number | null {
  return safeRatio(attributedRevenue, adSpend);
}

export function calculateExecutionSuccessRate(successful: number, total: number): number | null {
  return safeRatio(successful, total);
}

export function calculateAov(revenue: number, orders: number): number | null {
  return safeRatio(revenue, orders);
}

export function calculateRepairRate(repairs: number, attempts: number): number | null {
  return safeRatio(repairs, attempts);
}

export function sumMetricValues(values: number[]): number {
  return values.filter(Number.isFinite).reduce((acc, v) => acc + v, 0);
}

export function averageMetricValues(values: number[]): number | null {
  const valid = values.filter(Number.isFinite);
  if (valid.length === 0) return null;
  return sumMetricValues(valid) / valid.length;
}
