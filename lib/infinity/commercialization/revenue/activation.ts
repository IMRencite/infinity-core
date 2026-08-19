import { newId, nowIso, type CommercializationStore } from "../store";
import type {
  CommercialCheckoutConfiguration,
  CommercialPrice,
  CommercialProduct,
  RevenueActivationPlan,
  PricingModelType,
} from "../types";
import type { PaymentCapability } from "../providers/contracts";

export type MonetizationPlanLineage = {
  monetizationPlanId: string;
  monetizationRunId: string | null;
  candidateId: string | null;
  plannedPriceUsd: number;
  billingFrequency: string | null;
  modelType: string;
};

export function createRevenueActivationPlan(input: {
  store: CommercializationStore;
  organizationId: string;
  ventureId: string;
  commercializationPlanId: string;
  lineage: MonetizationPlanLineage;
  idempotencyKey: string;
}): RevenueActivationPlan {
  const existing = input.store.findByIdempotency(input.organizationId, input.idempotencyKey, input.store.revenuePlans);
  if (existing) return existing;

  const plan: RevenueActivationPlan = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercializationPlanId: input.commercializationPlanId,
    monetizationPlanId: input.lineage.monetizationPlanId,
    monetizationRunId: input.lineage.monetizationRunId,
    businessModel: input.lineage.modelType,
    pricingModel: input.lineage.billingFrequency ?? "ONE_TIME",
    status: "DRAFT",
    idempotencyKey: input.idempotencyKey,
  };
  input.store.revenuePlans.set(plan.id, plan);
  input.store.registerIdempotency(input.organizationId, input.idempotencyKey, plan.id);
  return plan;
}

export async function activateCommercialProduct(input: {
  store: CommercializationStore;
  payments: PaymentCapability;
  organizationId: string;
  ventureId: string;
  revenuePlan: RevenueActivationPlan;
  lineage: MonetizationPlanLineage;
  productName: string;
  idempotencyKey: string;
}): Promise<{ product: CommercialProduct; price: CommercialPrice }> {
  const existingProduct = input.store.findByIdempotency(input.organizationId, input.idempotencyKey, input.store.products);
  if (existingProduct) {
    const price = [...input.store.prices.values()].find((p) => p.commercialProductId === existingProduct.id);
    if (!price) throw new Error("PRICE_MISSING");
    return { product: existingProduct, price };
  }

  const metadata = {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    monetizationPlanId: input.lineage.monetizationPlanId,
    candidateId: input.lineage.candidateId ?? "",
  };

  const providerProduct = await input.payments.createProduct({
    name: input.productName,
    description: null,
    metadata,
  });

  const product: CommercialProduct = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    revenueActivationPlanId: input.revenuePlan.id,
    provider: input.payments.providerKey,
    providerProductId: providerProduct.providerProductId,
    name: input.productName,
    description: null,
    businessModel: input.lineage.modelType,
    status: "CONFIGURED",
    monetizationPlanId: input.lineage.monetizationPlanId,
    monetizationRunId: input.lineage.monetizationRunId,
    idempotencyKey: input.idempotencyKey,
  };

  const pricingType: PricingModelType =
    input.lineage.billingFrequency === "monthly" || input.lineage.billingFrequency === "MONTHLY"
      ? "SUBSCRIPTION"
      : "ONE_TIME";

  const providerPrice = await input.payments.createPrice({
    productId: providerProduct.providerProductId,
    amountUsd: input.lineage.plannedPriceUsd,
    currency: "USD",
    interval: pricingType === "SUBSCRIPTION" ? "month" : null,
    pricingType,
    metadata: { ...metadata, commercialProductId: product.id },
  });

  const price: CommercialPrice = {
    id: newId(),
    organizationId: input.organizationId,
    commercialProductId: product.id,
    providerPriceId: providerPrice.providerPriceId,
    amountUsd: input.lineage.plannedPriceUsd,
    currency: "USD",
    interval: providerPrice.interval,
    pricingType,
    active: true,
    estimateSource: "monetization_plan",
    monetizationPlanId: input.lineage.monetizationPlanId,
    lineage: {
      monetizationRunId: input.lineage.monetizationRunId,
      candidateId: input.lineage.candidateId,
      ventureId: input.ventureId,
      plannedPriceUsd: input.lineage.plannedPriceUsd,
    },
    idempotencyKey: `${input.idempotencyKey}:price`,
  };

  input.store.products.set(product.id, product);
  input.store.prices.set(price.id, price);
  input.store.registerIdempotency(input.organizationId, input.idempotencyKey, product.id);
  input.store.registerIdempotency(input.organizationId, price.idempotencyKey, price.id);

  input.revenuePlan.status = "CONFIGURING";
  input.store.revenuePlans.set(input.revenuePlan.id, input.revenuePlan);

  return { product, price };
}

export async function configureCheckout(input: {
  store: CommercializationStore;
  payments: PaymentCapability;
  organizationId: string;
  ventureId: string;
  product: CommercialProduct;
  price: CommercialPrice;
  idempotencyKey: string;
}): Promise<CommercialCheckoutConfiguration> {
  const existing = input.store.findByIdempotency(input.organizationId, input.idempotencyKey, input.store.checkouts);
  if (existing) return existing;

  const metadata = {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercialProductId: input.product.id,
    commercialPriceId: input.price.id,
  };

  const session = await input.payments.createCheckoutConfiguration({
    priceId: input.price.providerPriceId!,
    successUrl: `https://${input.ventureId}.mock/success`,
    cancelUrl: `https://${input.ventureId}.mock/cancel`,
    metadata,
  });

  const checkout: CommercialCheckoutConfiguration = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    commercialProductId: input.product.id,
    commercialPriceId: input.price.id,
    provider: input.payments.providerKey,
    checkoutUrl: session.checkoutUrl,
    successUrl: metadata.organizationId ? `https://${input.ventureId}.mock/success` : null,
    cancelUrl: `https://${input.ventureId}.mock/cancel`,
    status: "READY",
    ventureMetadata: metadata,
    idempotencyKey: input.idempotencyKey,
  };

  input.store.checkouts.set(checkout.id, checkout);
  input.store.registerIdempotency(input.organizationId, input.idempotencyKey, checkout.id);
  return checkout;
}
