import type { HqCopilotSource, HqCopilotSourceType } from "./types";

export function sourceRef(type: HqCopilotSourceType, label: string, id?: string, href?: string): HqCopilotSource {
  return { type, label, ...(id ? { id } : {}), ...(href ? { href } : {}) };
}

export function uniqueSources(sources: HqCopilotSource[]): HqCopilotSource[] {
  const seen = new Set<string>();
  const out: HqCopilotSource[] = [];
  for (const source of sources) {
    const key = `${source.type}:${source.id ?? source.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}
