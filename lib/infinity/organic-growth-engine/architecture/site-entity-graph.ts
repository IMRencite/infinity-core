import type { EvidenceConfidenceLevel } from "../constants";
import type { PageOpportunity, SiteEntity, SiteEntityGraph, VentureOrganicContext } from "../types";

export function buildSiteEntityGraph(
  context: VentureOrganicContext,
  opportunities: PageOpportunity[],
): SiteEntityGraph {
  const domain = context.domain ?? "example.com";
  const entities: SiteEntity[] = [
    {
      entityId: `https://${domain}/#organization`,
      entityType: "Organization",
      label: context.ventureName,
      canonicalUrl: `https://${domain}/`,
      canonicalAtId: `https://${domain}/#organization`,
      properties: { name: context.ventureName },
      sourceConfidence: "SOURCE_BACKED",
      relationships: [{ targetEntityId: `https://${domain}/#website`, relationship: "owns" }],
    },
    {
      entityId: `https://${domain}/#website`,
      entityType: "WebSite",
      label: context.ventureName,
      canonicalUrl: `https://${domain}/`,
      canonicalAtId: `https://${domain}/#website`,
      properties: { url: `https://${domain}/` },
      sourceConfidence: "SOURCE_BACKED",
      relationships: [{ targetEntityId: `https://${domain}/#organization`, relationship: "publisher" }],
    },
  ];

  for (const opp of opportunities) {
    if (opp.pageType === "homepage") continue;
    const entityType = mapPageTypeToEntityType(opp.pageType);
    const entityId = `https://${domain}/${slugEntity(opp.primaryEntity)}/#${entityType.toLowerCase()}`;
    if (entities.some((e) => e.entityId === entityId)) continue;

    const relationships: SiteEntity["relationships"] = [
      { targetEntityId: `https://${domain}/#organization`, relationship: "RELATED_SERVICE_AREA" },
    ];

    if (opp.geographicContext?.city) {
      const cityId = `https://${domain}/places/${slugEntity(opp.geographicContext.city)}/#city`;
      ensurePlaceEntity(entities, cityId, opp.geographicContext.city, "city", "DERIVED", domain);
      relationships.push({ targetEntityId: cityId, relationship: "LOCATED_IN" });
    }

    if (opp.geographicContext?.neighborhood && opp.geographicContext.city) {
      const neighborhoodId = `https://${domain}/places/${slugEntity(opp.geographicContext.city)}/${slugEntity(opp.geographicContext.neighborhood)}/#neighborhood`;
      const cityId = `https://${domain}/places/${slugEntity(opp.geographicContext.city)}/#city`;
      ensurePlaceEntity(
        entities,
        neighborhoodId,
        opp.geographicContext.neighborhood,
        "neighborhood",
        "DERIVED",
        domain,
        [{ targetEntityId: cityId, relationship: "PART_OF" }],
      );
      relationships.push({ targetEntityId: neighborhoodId, relationship: "LOCATED_IN" });
    }

    entities.push({
      entityId,
      entityType,
      label: opp.primaryEntity,
      canonicalAtId: entityId,
      properties: { pageType: opp.pageType, intent: opp.primaryIntent },
      sourceConfidence: mapConfidence(opp.evidenceAvailability),
      relationships,
    });
  }

  return { domain, entities };
}

function ensurePlaceEntity(
  entities: SiteEntity[],
  entityId: string,
  label: string,
  entityType: string,
  confidence: EvidenceConfidenceLevel,
  domain: string,
  relationships: SiteEntity["relationships"] = [],
): void {
  if (entities.some((e) => e.entityId === entityId)) return;
  entities.push({
    entityId,
    entityType,
    label,
    canonicalAtId: entityId,
    properties: { placeType: entityType },
    sourceConfidence: confidence,
    relationships: [
      { targetEntityId: `https://${domain}/#organization`, relationship: "SERVES" },
      ...relationships,
    ],
  });
}

function mapPageTypeToEntityType(pageType: string): string {
  if (pageType === "city") return "City";
  if (pageType === "neighborhood") return "Neighborhood";
  if (pageType === "airport") return "Airport";
  if (pageType === "product") return "Product";
  if (pageType === "service") return "Service";
  if (pageType === "route") return "Route";
  return "Thing";
}

function slugEntity(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function mapConfidence(value: number): EvidenceConfidenceLevel {
  if (value >= 0.8) return "SOURCE_BACKED";
  if (value >= 0.55) return "DERIVED";
  if (value >= 0.3) return "ESTIMATED";
  return "UNKNOWN";
}
