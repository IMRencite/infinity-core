import type { Gate } from "./types";

export const CARD_TEXT_RHYTHM_GATE = "CardTextRhythmGate" as const;

export function estimateLineCount(text: string, maxCharsPerLine = 28): number {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  let lineWidth = 0;
  let lines = 1;
  for (const word of words) {
    const next = lineWidth === 0 ? word.length : lineWidth + 1 + word.length;
    if (lineWidth > 0 && next > maxCharsPerLine) {
      lines += 1;
      lineWidth = word.length;
    } else {
      lineWidth = next;
    }
  }
  return lines;
}

export function lastLineWordCount(text: string, maxCharsPerLine = 36): number {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  let line: string[] = [];
  let lineWidth = 0;
  const lines: string[][] = [];
  for (const word of words) {
    const next = lineWidth === 0 ? word.length : lineWidth + 1 + word.length;
    if (line.length > 0 && next > maxCharsPerLine) {
      lines.push(line);
      line = [word];
      lineWidth = word.length;
    } else {
      line.push(word);
      lineWidth = next;
    }
  }
  if (line.length) lines.push(line);
  return lines[lines.length - 1]?.length ?? 0;
}

export function evaluateCardTextRhythm(input: {
  titles?: readonly string[];
  descriptions?: readonly string[];
  lastLineWordCounts?: readonly number[];
  titleLineCounts?: readonly number[];
  descriptionLineCounts?: readonly number[];
  cardWidthPx?: number;
  maxTitleLines?: number;
  maxDescriptionLines?: number;
  css?: string;
}): {
  gate: typeof CARD_TEXT_RHYTHM_GATE;
  orphanCount: number;
  balancedWrap: boolean;
  extremeWrapCount: number;
  overall: Gate;
  failures: string[];
} {
  const failures: string[] = [];
  const measured = input.lastLineWordCounts ?? [
    ...(input.titles ?? []).map((text) => lastLineWordCount(text, 28)),
    ...(input.descriptions ?? []).map((text) => lastLineWordCount(text)),
  ];
  const orphanCount = measured.filter((count) => count === 1).length;
  if (orphanCount > 0) failures.push("single_word_orphan_line");
  const charsFromWidth = input.cardWidthPx ? Math.max(12, Math.floor(input.cardWidthPx / 8.2)) : 28;
  const titleLines =
    input.titleLineCounts ??
    (input.titles ?? []).map((text) => estimateLineCount(text, Math.min(28, charsFromWidth)));
  const descriptionLines =
    input.descriptionLineCounts ??
    (input.descriptions ?? []).map((text) => estimateLineCount(text, charsFromWidth));
  const extremeWrapCount = titleLines.filter((count) => count >= 5).length;
  if (extremeWrapCount > 0) failures.push("extreme_narrow_column_title_wrap");
  if (input.maxTitleLines != null && titleLines.some((count) => count > input.maxTitleLines!)) {
    failures.push("title_line_count_too_high");
  }
  if (input.maxDescriptionLines != null && descriptionLines.some((count) => count > input.maxDescriptionLines!)) {
    failures.push("description_line_count_too_high");
  }
  const balancedWrap = /text-wrap:\s*balance/.test(input.css ?? "");
  if ((input.titles?.length || input.descriptions?.length) && !balancedWrap && !input.lastLineWordCounts) {
    failures.push("missing_balanced_text_wrap");
  }
  return {
    gate: CARD_TEXT_RHYTHM_GATE,
    orphanCount,
    balancedWrap,
    extremeWrapCount,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}
