import { normalizeTopicKey } from "../decisions/cannibalization-engine";
import type { VentureTopicGraph, TopicNode } from "./types";
import { normalizeQuestionIntent } from "./voc";

export const OCCUPANCYNPV_CRE_UNIVERSE = {
  venture_id: "occupancynpv",
  pillars: [
    {
      label: "Valuation",
      clusters: ["NOI", "Cap Rates", "DCF", "Comparable Sales", "Property Valuation", "Occupancy Economics"],
    },
    {
      label: "Leasing",
      clusters: ["Triple Net", "Gross Lease", "Modified Gross", "CAM", "Rent Escalations", "Lease Analysis"],
    },
    { label: "Financing", clusters: ["Debt", "Equity", "Refinancing"] },
    { label: "Investment", clusters: ["Returns", "Hold Period", "Risk"] },
    { label: "Due Diligence", clusters: ["Financial Diligence", "Physical Diligence"] },
    { label: "Asset Management", clusters: ["Operations", "CapEx"] },
    { label: "Property Types", clusters: ["Office", "Industrial", "Retail", "Multifamily"] },
    { label: "Market Analysis", clusters: ["Supply", "Demand", "Absorption"] },
    { label: "Taxes", clusters: ["Property Tax", "1031"] },
    { label: "Transactions", clusters: ["Acquisition", "Disposition"] },
    { label: "Risk", clusters: ["Vacancy", "Credit", "Interest Rate"] },
  ],
} as const;

export function slugifyOrganic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildVentureTopicGraph(input: {
  venture_id: string;
  existing_urls?: string[];
  extra_questions?: string[];
}): VentureTopicGraph {
  const nodes: TopicNode[] = [];
  const questions: string[] = [];
  const gaps: string[] = [];
  const cre = /occupancy|occupancynpv|7e7e924e-0741-4155-a729-8d529da77ea9/i.test(input.venture_id);
  const root = cre ? OCCUPANCYNPV_CRE_UNIVERSE : {
    venture_id: input.venture_id,
    pillars: [{ label: "Core", clusters: ["Overview"] }],
  };
  const existing = new Set(input.existing_urls ?? []);
  for (const pillar of root.pillars) {
    const pillarId = `pillar:${slugifyOrganic(pillar.label)}`;
    nodes.push({
      id: pillarId,
      label: pillar.label,
      kind: "pillar",
      parent_id: null,
      search_intent: "informational",
      geo_intent: false,
      commercial_intent: /investment|financing|transactions/i.test(pillar.label),
      existing_urls: [...existing].filter((url) => url.includes(slugifyOrganic(pillar.label))),
      gap: false,
    });
    for (const cluster of pillar.clusters) {
      const clusterId = `cluster:${slugifyOrganic(pillar.label)}:${slugifyOrganic(cluster)}`;
      const pathHint = `/commercial-real-estate/${slugifyOrganic(pillar.label)}/${slugifyOrganic(cluster)}/`;
      const covered = [...existing].some((url) => url.includes(slugifyOrganic(cluster)));
      nodes.push({
        id: clusterId,
        label: cluster,
        kind: "cluster",
        parent_id: pillarId,
        search_intent: "informational",
        geo_intent: false,
        commercial_intent: /lease|cap rate|noi|dcf/i.test(cluster),
        existing_urls: covered ? [pathHint] : [],
        gap: !covered,
      });
      if (!covered) gaps.push(cluster);
    }
  }
  for (const question of input.extra_questions ?? []) {
    questions.push(question);
    nodes.push({
      id: `question:${slugifyOrganic(question)}`,
      label: question,
      kind: "question",
      parent_id: inferQuestionParent(question, nodes),
      search_intent: "informational",
      geo_intent: false,
      commercial_intent: /cost|price|compare|vs/i.test(question),
      existing_urls: [],
      gap: true,
    });
    gaps.push(question);
  }
  return {
    venture_id: input.venture_id,
    nodes,
    questions,
    entities: nodes.filter((row) => row.kind === "cluster").map((row) => row.label),
    content_gaps: [...new Set(gaps)],
    internal_links: [],
    authority_sources: ["appraisal institute", "nareit", "sec filings"],
    sales_relevance: Object.fromEntries(nodes.filter((row) => row.commercial_intent).map((row) => [row.id, 0.8])),
    refresh_state: {},
  };
}

function inferQuestionParent(question: string, nodes: TopicNode[]): string | null {
  const key = normalizeTopicKey(question);
  const cap = nodes.find((row) => row.label.toLowerCase().includes("cap rate"));
  if (/cap rate/.test(key) && cap) return cap.id;
  const noi = nodes.find((row) => row.label === "NOI");
  if (/\bnoi\b|net operating/.test(key) && noi) return noi.id;
  return nodes.find((row) => row.kind === "pillar")?.id ?? null;
}

export function buildTopicUniverse(graph: VentureTopicGraph) {
  return {
    pillars: graph.nodes.filter((row) => row.kind === "pillar").map((row) => row.label),
    clusters: graph.nodes.filter((row) => row.kind === "cluster").map((row) => row.label),
    questions: graph.questions,
    entities: graph.entities,
    commercial_intents: graph.nodes.filter((row) => row.commercial_intent).map((row) => row.label),
    gaps: graph.content_gaps,
  };
}

export function buildQuestionUniverse(graph: VentureTopicGraph, vocQuestions: string[]) {
  const unique = [...new Set([...graph.questions, ...vocQuestions].map((row) => row.trim()).filter(Boolean))];
  return { questions: unique, normalized: unique.map((row) => normalizeQuestionIntent(row)) };
}
