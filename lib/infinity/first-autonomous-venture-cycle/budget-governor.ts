export type BudgetLedgerEntry = {
  stage: string;
  provider?: string | null;
  costUsd: number | null;
  known: boolean;
  note?: string;
};

export class CycleBudgetGovernor {
  readonly hardCapUsd = 10;
  readonly warningThresholdUsd = 8;
  private knownTotalUsd = 0;
  private unknownCallCount = 0;
  readonly ledger: BudgetLedgerEntry[] = [];

  record(entry: Omit<BudgetLedgerEntry, "known"> & { known?: boolean }) {
    const known = entry.known ?? entry.costUsd != null;
    this.ledger.push({ ...entry, known });
    if (entry.costUsd != null && Number.isFinite(entry.costUsd)) {
      this.knownTotalUsd += entry.costUsd;
    } else if (!known) {
      this.unknownCallCount += 1;
    }
  }

  get knownTotalUsdValue() {
    return this.knownTotalUsd;
  }

  get unknownCostCallCount() {
    return this.unknownCallCount;
  }

  get hasUnknownCosts() {
    return this.unknownCallCount > 0;
  }

  /** Unknown provider costs are tracked but do not auto-block FAVC1 at tiny spend levels. */
  get budgetWarning() {
    return this.knownTotalUsd >= this.warningThresholdUsd;
  }

  get budgetExceeded() {
    return this.knownTotalUsd >= this.hardCapUsd;
  }

  assertRoom(stage: string, estimatedUsd = 0) {
    if (this.budgetExceeded) {
      throw new Error(`Provider budget exhausted before ${stage}`);
    }
    if (this.knownTotalUsd + estimatedUsd > this.hardCapUsd) {
      throw new Error(`Provider budget would exceed $${this.hardCapUsd} at ${stage}`);
    }
  }
}
