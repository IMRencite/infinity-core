import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { FeatureContract } from "../types";

export function generateMarketplaceFeatureContracts(blueprint: VentureBlueprintDraft): FeatureContract[] {
  const base = (id: string, name: string, extra: Partial<FeatureContract>): FeatureContract => ({
    featureId: id,
    featureName: name,
    businessPurpose: extra.businessPurpose ?? name,
    userRoles: extra.userRoles ?? [],
    functionalRequirements: extra.functionalRequirements ?? [],
    nonFunctionalRequirements: extra.nonFunctionalRequirements ?? ["type-safe", "tested"],
    dependencies: extra.dependencies ?? [],
    requiredRoutes: extra.requiredRoutes ?? [],
    requiredDataEntities: extra.requiredDataEntities ?? [],
    requiredAPIs: extra.requiredAPIs ?? [],
    requiredUIStates: extra.requiredUIStates ?? ["loading", "empty", "error"],
    requiredErrorStates: extra.requiredErrorStates ?? ["unauthorized", "not_found"],
    requiredAnalyticsEvents: extra.requiredAnalyticsEvents ?? [],
    requiredTests: extra.requiredTests ?? [],
    acceptanceCriteria: extra.acceptanceCriteria ?? [],
    revenueRelationship: extra.revenueRelationship ?? "",
    status: "PLANNED",
  });

  return [
    base("auth_system", "Authentication & Sessions", {
      userRoles: ["creator", "consumer", "moderator"],
      functionalRequirements: ["register", "login", "logout", "session persistence", "protected routes"],
      requiredRoutes: ["/login", "/register", "/api/auth/register", "/api/auth/login", "/api/auth/logout"],
      requiredDataEntities: ["users", "sessions"],
      requiredAPIs: ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me"],
      requiredTests: ["auth-ownership.test.ts"],
      acceptanceCriteria: ["Creator and consumer can register and login", "Protected routes reject anonymous users"],
    }),
    base("creator_profiles", "Creator Profiles", {
      userRoles: ["creator"],
      dependencies: ["auth_system"],
      requiredRoutes: ["/creator/[id]", "/dashboard/profile"],
      requiredDataEntities: ["creator_profiles"],
      requiredAPIs: ["/api/auth/me"],
      acceptanceCriteria: ["Creator can create and view profile", "Public creator page renders bio and storefront"],
    }),
    base("content_posts", "Content / Artwork Posts", {
      userRoles: ["creator", "consumer"],
      dependencies: ["auth_system", "creator_profiles"],
      requiredDataEntities: ["posts", "media_metadata"],
      requiredAPIs: ["/api/posts", "/api/posts/[id]"],
      requiredRoutes: ["/feed", "/post/[id]"],
      requiredAnalyticsEvents: ["post_created", "post_viewed"],
      acceptanceCriteria: ["Creator can publish post with media metadata", "Consumers can view post detail"],
    }),
    base("engagement", "Likes, Comments, Follows", {
      userRoles: ["consumer", "creator"],
      dependencies: ["content_posts"],
      requiredDataEntities: ["likes", "comments", "follows"],
      requiredAPIs: ["/api/likes", "/api/comments", "/api/follow"],
      requiredAnalyticsEvents: ["post_liked", "comment_created", "creator_followed"],
      acceptanceCriteria: ["Consumer can like, comment, and follow creators"],
    }),
    base("discovery", "Feed, Search, Filtering", {
      userRoles: ["consumer"],
      dependencies: ["content_posts"],
      requiredRoutes: ["/feed", "/search"],
      requiredAPIs: ["/api/feed", "/api/search"],
      acceptanceCriteria: ["Feed lists posts", "Search filters by query"],
    }),
    base("marketplace_listings", "Creator Storefront & Listings", {
      userRoles: ["creator", "consumer"],
      dependencies: ["creator_profiles"],
      requiredDataEntities: ["listings", "products"],
      requiredRoutes: ["/creator/[id]/store", "/listing/[id]"],
      requiredAPIs: ["/api/listings", "/api/listings/[id]"],
      revenueRelationship: "marketplace_commission",
      acceptanceCriteria: ["Creator can create listing", "Listing detail shows price and creator"],
    }),
    base("transactions", "Transaction Abstraction", {
      userRoles: ["consumer", "creator"],
      dependencies: ["marketplace_listings"],
      requiredDataEntities: ["transactions"],
      requiredAPIs: ["/api/transactions", "/api/transactions/[id]"],
      requiredAnalyticsEvents: ["transaction_initiated", "revenue_event"],
      revenueRelationship: "marketplace_commission",
      acceptanceCriteria: ["Consumer can initiate sandbox transaction", "Transaction state transitions recorded"],
    }),
    base("commission_engine", "Marketplace Commission Calculation", {
      dependencies: ["transactions"],
      requiredTests: ["commission.test.ts"],
      revenueRelationship: "marketplace_commission",
      acceptanceCriteria: ["Commission calculated deterministically from configured take rate"],
    }),
    base("premium_subscription", "Premium Creator Subscription Abstraction", {
      userRoles: ["creator", "consumer"],
      dependencies: ["auth_system"],
      requiredDataEntities: ["subscriptions", "entitlements"],
      requiredAPIs: ["/api/subscriptions"],
      revenueRelationship: "creator_subscription",
      acceptanceCriteria: ["Premium plan represented in sandbox mode", "Entitlement check API exists"],
    }),
    base("moderation", "Moderation & Reporting", {
      userRoles: ["moderator", "consumer"],
      dependencies: ["content_posts"],
      requiredRoutes: ["/admin/moderation"],
      requiredAPIs: ["/api/reports", "/api/moderation"],
      requiredDataEntities: ["reports", "moderation_actions"],
      acceptanceCriteria: ["User can report content", "Moderator can change moderation state"],
    }),
    base("analytics_seo", "Analytics & Public SEO", {
      dependencies: ["content_posts"],
      requiredRoutes: ["/sitemap.xml", "/robots.txt"],
      requiredAnalyticsEvents: ["north_star_engagement"],
      acceptanceCriteria: ["Analytics events emitted", "Sitemap and robots routes exist"],
    }),
  ];
}

export function generateTraceabilityLinks(
  blueprint: VentureBlueprintDraft,
  contracts: FeatureContract[],
): import("../types").TraceabilityLink[] {
  const links: import("../types").TraceabilityLink[] = [];
  const candidateId = blueprint.sourceLineage.opportunityCandidateId ?? "marketplace-test";
  links.push({ linkType: "opportunity_to_blueprint", sourceRef: candidateId, targetRef: "venture_blueprint" });
  links.push({
    linkType: "monetization_to_blueprint",
    sourceRef: blueprint.core.primaryMonetizationModel,
    targetRef: blueprint.revenueArchitecture.monetizationModelType,
  });
  for (const contract of contracts) {
    links.push({ linkType: "blueprint_to_feature_contract", sourceRef: "build_package", targetRef: contract.featureId });
    for (const route of contract.requiredRoutes) {
      links.push({ linkType: "feature_to_route", sourceRef: contract.featureId, targetRef: route });
    }
    for (const test of contract.requiredTests) {
      links.push({ linkType: "feature_to_test", sourceRef: contract.featureId, targetRef: test });
    }
  }
  return links;
}
