export class ProductAssetBuilderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ProductAssetBuilderError";
  }
}

export class WorkspaceIsolationError extends ProductAssetBuilderError {
  constructor(message: string) {
    super(message, "WORKSPACE_ISOLATION");
  }
}

export class CostLimitExceededError extends ProductAssetBuilderError {
  constructor(message: string) {
    super(message, "COST_LIMIT_EXCEEDED");
  }
}

export class BuildValidationError extends ProductAssetBuilderError {
  constructor(message: string, public readonly validatorName: string) {
    super(message, "VALIDATION_FAILED");
  }
}
