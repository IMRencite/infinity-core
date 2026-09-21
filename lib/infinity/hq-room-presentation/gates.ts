import { HQ_FIRST_CLASS_ROOMS } from "@/lib/infinity/hq-first-class-room/registry";
import {
  GLOBAL_SHARED_COMPONENT_DEFECT,
  GROWTH_NEXUS_COMPLETENESS_GATE,
  HQ_CARD_CONTENT_SPACING_CONTRACT,
  HQ_CARD_SPACING,
  HQ_CIRCULAR_CONTENT_SPACING_GATE,
  HQ_CIRCULAR_GEOMETRY,
  HQ_CIRCULAR_GEOMETRY_GATE,
  HQ_CIRCULAR_OUTPUT_CARD,
  HQ_CIRCULAR_OUTPUT_PRESENTATION_CONTRACT,
  HQ_CIRCULAR_RENDERED_QUALITY_GATE,
  HQ_CONTENT_OVERFLOW_GATE,
  HQ_FIRST_CLASS_ROOM_RENDERED_QC_REGISTRY,
  HQ_FIRST_CLASS_ROOM_RENDERED_QUALITY_GATE,
  HQ_LONG_CONTENT_PRESENTATION_GATE,
  HQ_LONG_CONTENT_THRESHOLD,
  HQ_ROOM_CONTENT_RHYTHM_GATE,
  HQ_ROOM_OUTPUT_COUNT_CONSISTENCY_GATE,
  HQ_ROOM_STATE_CONTENT_CONSISTENCY_GATE,
  HQ_TEXT_COLLISION_GATE,
  HQ_VISUAL_DESIGN_INTENT_GATE,
  REPEATED_HQ_VISUAL_DEFECT_PROMOTION_GATE,
  REPEATED_VISUAL_DEFECT_ESCAPED_QC,
  type HqCircleEligibility,
  type HqVisualForm,
  type NamedPresentationGate,
} from "./contract";
import { hqFirstClassRoomRenderedQCRegistry } from "./contract";
import {
  circularNodeAllowed,
  hqPresentationKind,
  roomInheritsCircularQC,
  usesCompactPillGeometry,
} from "./primitives";

export function evaluateHQCardContentSpacingContract(input: {
  horizontalPaddingPx: number;
  verticalPaddingPx: number;
  lineHeight: number;
  textBorderGapPx: number;
  titleBodyGapPx: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.horizontalPaddingPx < HQ_CARD_SPACING.padX) reasons.push("HORIZONTAL_PADDING_CRAMPED");
  if (input.verticalPaddingPx < HQ_CARD_SPACING.padY) reasons.push("VERTICAL_PADDING_CRAMPED");
  if (input.lineHeight < HQ_CARD_SPACING.lineHeight) reasons.push("LINE_HEIGHT_CRAMPED");
  if (input.textBorderGapPx < HQ_CARD_SPACING.minTextBorderGap) reasons.push("TEXT_BORDER_COLLISION");
  if (input.titleBodyGapPx < HQ_CARD_SPACING.titleBodyGap) reasons.push("TITLE_BODY_COLLISION");
  return { gate: HQ_CARD_CONTENT_SPACING_CONTRACT, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQLongContentPresentationGate(input: {
  value: string;
  semantic?: Parameters<typeof hqPresentationKind>[0]["semantic"];
  role?: Parameters<typeof hqPresentationKind>[0]["role"];
  renderedKind?: ReturnType<typeof hqPresentationKind>;
}): NamedPresentationGate {
  const kind = input.renderedKind ?? hqPresentationKind({ semantic: input.semantic, value: input.value, role: input.role });
  const long =
    input.value.length > HQ_LONG_CONTENT_THRESHOLD ||
    / — |UNKNOWN —|qualified conversations|entry offer|learning objective/i.test(input.value);
  const reasons: string[] = [];
  if (long && usesCompactPillGeometry(kind)) reasons.push("LONG_CONTENT_IN_COMPACT_PILL");
  if (long && kind === HQ_CIRCULAR_OUTPUT_CARD) reasons.push("LONG_CONTENT_IN_COMPACT_CIRCLE");
  return { gate: HQ_LONG_CONTENT_PRESENTATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQRoomStateContentConsistencyGate(input: {
  renderedState: string;
  currentWorkCount: number;
  recentOutputCount: number;
  canonicalRecordCount: number;
  roomSpecificEmptyAllowed?: boolean;
}): NamedPresentationGate {
  const content = input.currentWorkCount + input.recentOutputCount + input.canonicalRecordCount;
  const empty = input.renderedState === "EMPTY";
  const reasons: string[] = [];
  if (empty && content > 0 && !input.roomSpecificEmptyAllowed) {
    reasons.push("EMPTY_WHILE_CONTENT_EXISTS");
  }
  return { gate: HQ_ROOM_STATE_CONTENT_CONSISTENCY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQRoomOutputCountConsistencyGate(input: {
  announcedOutputCount: number;
  renderedOutputCount: number;
  viewAllAvailable: boolean;
  renderedState: string;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.announcedOutputCount > 0 && input.renderedOutputCount === 0 && !input.viewAllAvailable) {
    reasons.push("ANNOUNCED_OUTPUTS_NOT_RENDERED");
  }
  if (input.renderedState === "EMPTY" && input.announcedOutputCount > 0) {
    reasons.push("EMPTY_CONTRADICTS_OUTPUT_COUNT");
  }
  return { gate: HQ_ROOM_OUTPUT_COUNT_CONSISTENCY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateGrowthNexusCompletenessGate(input: {
  strategyExists: boolean;
  outputExists: boolean;
  campaignExists: boolean;
  learningObjectiveExists: boolean;
  renderedEmpty: boolean;
}): NamedPresentationGate {
  const hasContent = input.strategyExists || input.outputExists || input.campaignExists || input.learningObjectiveExists;
  const reasons: string[] = [];
  if (hasContent && input.renderedEmpty) reasons.push("GROWTH_NEXUS_EMPTY_DESPITE_STRATEGY");
  return { gate: GROWTH_NEXUS_COMPLETENESS_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQTextCollisionGate(input: {
  textOverlapsText: boolean;
  textOverlapsBorder: boolean;
  textOverlapsBadge: boolean;
  cardOverlap: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.textOverlapsText) reasons.push("TEXT_OVERLAPS_TEXT");
  if (input.textOverlapsBorder) reasons.push("TEXT_OVERLAPS_BORDER");
  if (input.textOverlapsBadge) reasons.push("TEXT_OVERLAPS_BADGE");
  if (input.cardOverlap) reasons.push("CARD_OVERLAP");
  return { gate: HQ_TEXT_COLLISION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQContentOverflowGate(input: {
  clipped: boolean;
  hidden: boolean;
  overflowedOutsideCard: boolean;
  unreadablyTruncated: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.clipped) reasons.push("CLIPPED");
  if (input.hidden) reasons.push("HIDDEN");
  if (input.overflowedOutsideCard) reasons.push("OVERFLOW_OUTSIDE_CARD");
  if (input.unreadablyTruncated) reasons.push("UNREADABLE_TRUNCATION");
  return { gate: HQ_CONTENT_OVERFLOW_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQRoomContentRhythmGate(input: {
  rowGapPx: number;
  sectionGapPx: number;
  titleBodyGapPx: number;
  metadataGapPx: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.rowGapPx < HQ_CARD_SPACING.rowGap) reasons.push("ROW_GAP_CRAMPED");
  if (input.sectionGapPx < HQ_CARD_SPACING.sectionGap) reasons.push("SECTION_GAP_CRAMPED");
  if (input.titleBodyGapPx < HQ_CARD_SPACING.titleBodyGap) reasons.push("TITLE_BODY_GAP_CRAMPED");
  if (input.metadataGapPx < HQ_CARD_SPACING.metadataGap) reasons.push("METADATA_GAP_CRAMPED");
  return { gate: HQ_ROOM_CONTENT_RHYTHM_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQFirstClassRoomRenderedQCRegistry(): NamedPresentationGate {
  const registered = hqFirstClassRoomRenderedQCRegistry();
  const missing = HQ_FIRST_CLASS_ROOMS.map((room) => room.id).filter((id) => !registered.includes(id));
  return {
    gate: HQ_FIRST_CLASS_ROOM_RENDERED_QC_REGISTRY,
    result: missing.length === 0 ? "PASS" : "FAIL",
    reasons: missing.map((id) => `QC_OMITTED:${id}`),
  };
}

export function evaluateHQFirstClassRoomRenderedQualityGate(input: {
  roomId: string;
  readableCards: boolean;
  collisions: boolean;
  clipping: boolean;
  overflow: boolean;
  stateContentConsistent: boolean;
  usesCircularOutputs?: boolean;
  artifactTypes?: string[];
  circularGeometry?: Parameters<typeof evaluateHQCircularGeometryGate>[0];
  circularSpacing?: Parameters<typeof evaluateHQCircularContentSpacingGate>[0];
  visualForm?: Parameters<typeof evaluateHQVisualDesignIntentGate>[0];
  longContentSeparated?: boolean;
}): NamedPresentationGate {
  const registry = evaluateHQFirstClassRoomRenderedQCRegistry();
  const reasons: string[] = [];
  if (!registry.reasons.every((reason) => !reason.includes(input.roomId)) && registry.result === "FAIL") {
    reasons.push(`ROOM_OMITTED_FROM_QC:${input.roomId}`);
  }
  if (!HQ_FIRST_CLASS_ROOMS.some((room) => room.id === input.roomId)) {
    // future rooms inherit once registered; unknown ids fail closed only if claimed as first-class
  }
  if (!input.readableCards) reasons.push("UNREADABLE_CARDS");
  if (input.collisions) reasons.push("COLLISIONS");
  if (input.clipping) reasons.push("CLIPPING");
  if (input.overflow) reasons.push("OVERFLOW");
  if (!input.stateContentConsistent) reasons.push("STATE_CONTENT_INCONSISTENT");
  if (
    roomInheritsCircularQC({
      roomId: input.roomId,
      usesCircularOutputs: input.usesCircularOutputs,
      artifactTypes: input.artifactTypes,
    })
  ) {
    if (!input.circularGeometry) reasons.push("CIRCULAR_GEOMETRY_NOT_MEASURED");
    else {
      const geometry = evaluateHQCircularGeometryGate(input.circularGeometry);
      if (geometry.result === "FAIL") reasons.push(...geometry.reasons);
    }
    if (!input.circularSpacing) reasons.push("CIRCULAR_SPACING_NOT_MEASURED");
    else {
      const spacing = evaluateHQCircularContentSpacingGate(input.circularSpacing);
      if (spacing.result === "FAIL") reasons.push(...spacing.reasons);
    }
    if (!input.visualForm) reasons.push("VISUAL_FORM_NOT_DECLARED");
    else {
      const intent = evaluateHQVisualDesignIntentGate(input.visualForm);
      if (intent.result === "FAIL") reasons.push(...intent.reasons);
    }
    if (input.longContentSeparated === false) reasons.push("LONG_CONTENT_NOT_SEPARATED_FROM_CIRCLE");
  }
  return { gate: HQ_FIRST_CLASS_ROOM_RENDERED_QUALITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateRepeatedHQVisualDefectPromotionGate(input: {
  roomsWithEquivalentDefect: string[];
  repairedLocallyOnly: boolean;
  erasedDeclaredVisualForm?: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.roomsWithEquivalentDefect.length >= 2) {
    reasons.push(GLOBAL_SHARED_COMPONENT_DEFECT);
    if (input.repairedLocallyOnly) reasons.push(REPEATED_VISUAL_DEFECT_ESCAPED_QC);
  }
  if (input.erasedDeclaredVisualForm) reasons.push("VISUAL_LANGUAGE_ERASED_BY_READABILITY_REPAIR");
  return {
    gate: REPEATED_HQ_VISUAL_DEFECT_PROMOTION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQCircularGeometryGate(input: {
  intendedForm: HqVisualForm;
  widthPx: number;
  heightPx: number;
  borderRadiusPx?: number;
  borderRadiusPercent?: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.intendedForm !== "CIRCULAR_OUTPUT") {
    return { gate: HQ_CIRCULAR_GEOMETRY_GATE, result: "PASS", reasons };
  }
  const ratio = input.heightPx === 0 ? Number.POSITIVE_INFINITY : input.widthPx / input.heightPx;
  if (Math.abs(ratio - HQ_CIRCULAR_GEOMETRY.aspectRatio) > HQ_CIRCULAR_GEOMETRY.maxAspectDelta) {
    reasons.push("NOT_1_TO_1_CIRCLE");
  }
  const radiusPercent =
    input.borderRadiusPercent ??
    (input.borderRadiusPx != null && input.widthPx > 0 ? (input.borderRadiusPx / input.widthPx) * 200 : 0);
  if (radiusPercent < HQ_CIRCULAR_GEOMETRY.borderRadiusPercent - 1) {
    reasons.push("NOT_TRUE_CIRCULAR_RADIUS");
  }
  if (input.borderRadiusPx != null && input.borderRadiusPx <= HQ_CARD_SPACING.cardRadius + 2) {
    reasons.push("ROUNDED_RECTANGLE_NOT_CIRCLE");
  }
  if (Math.min(input.widthPx, input.heightPx) < HQ_CIRCULAR_GEOMETRY.minDiameterPx) {
    reasons.push("CIRCLE_DIAMETER_TOO_SMALL");
  }
  return { gate: HQ_CIRCULAR_GEOMETRY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQCircularContentSpacingGate(input: {
  horizontalPaddingPx: number;
  verticalPaddingPx: number;
  lineHeight: number;
  textTouchesCircumference: boolean;
  overflow: boolean;
  clipped?: boolean;
  fontSizePx: number;
  centered?: boolean;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.horizontalPaddingPx < HQ_CIRCULAR_GEOMETRY.padPx) reasons.push("CIRCLE_HORIZONTAL_PADDING_CRAMPED");
  if (input.verticalPaddingPx < HQ_CIRCULAR_GEOMETRY.padPx) reasons.push("CIRCLE_VERTICAL_PADDING_CRAMPED");
  if (input.lineHeight < HQ_CIRCULAR_GEOMETRY.lineHeight) reasons.push("CIRCLE_LINE_HEIGHT_CRAMPED");
  if (input.textTouchesCircumference) reasons.push("TEXT_TOUCHES_CIRCUMFERENCE");
  if (input.overflow) reasons.push("CIRCLE_OVERFLOW");
  if (input.clipped) reasons.push("CIRCLE_CLIPPING");
  if (input.fontSizePx < 12) reasons.push("TINY_FONT_WORKAROUND");
  if (input.centered === false) reasons.push("CIRCLE_CONTENT_NOT_CENTERED");
  return { gate: HQ_CIRCULAR_CONTENT_SPACING_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQVisualDesignIntentGate(input: {
  intended: HqVisualForm;
  rendered: HqVisualForm;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.intended === "CIRCULAR_OUTPUT" && input.rendered !== "CIRCULAR_OUTPUT") {
    reasons.push("DECLARED_CIRCLE_RENDERED_AS_RECTANGLE");
  }
  return { gate: HQ_VISUAL_DESIGN_INTENT_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQCircularOutputPresentationContract(input: {
  semanticType: HqCircleEligibility;
  orbValue: string;
  detailValue?: string | null;
  widthPx: number;
  heightPx: number;
  borderRadiusPercent: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  const longOrb = input.orbValue.length > HQ_LONG_CONTENT_THRESHOLD || / — |entry offer|willingness to pay/i.test(input.orbValue);
  if (longOrb) reasons.push("LONG_CONTENT_IN_COMPACT_CIRCLE");
  if (!circularNodeAllowed(input.semanticType) && !input.detailValue) {
    reasons.push("INELIGIBLE_CONTENT_FORCED_INTO_CIRCLE");
  }
  const geometry = evaluateHQCircularGeometryGate({
    intendedForm: "CIRCULAR_OUTPUT",
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    borderRadiusPercent: input.borderRadiusPercent,
  });
  reasons.push(...geometry.reasons);
  return { gate: HQ_CIRCULAR_OUTPUT_PRESENTATION_CONTRACT, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQCircularResponsiveGrid(input: {
  viewportWidthPx: number;
  columnCount: number;
  circleDiameterPx: number;
  fontSizePx: number;
}): NamedPresentationGate {
  const reasons: string[] = [];
  if (input.circleDiameterPx < HQ_CIRCULAR_GEOMETRY.minDiameterPx) reasons.push("CIRCLE_SHRUNK_UNREADABLE");
  if (input.fontSizePx < 12) reasons.push("TYPOGRAPHY_SHRUNK_UNREADABLE");
  if (input.viewportWidthPx < 900 && input.columnCount > 2) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  if (input.viewportWidthPx < 768 && input.columnCount > 1) reasons.push("GRID_TOO_DENSE_FOR_VIEWPORT");
  return { gate: "HQCircularResponsiveGrid", result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQCircularRenderedQualityGate(input: {
  geometry: Parameters<typeof evaluateHQCircularGeometryGate>[0];
  spacing: Parameters<typeof evaluateHQCircularContentSpacingGate>[0];
  longContent: Parameters<typeof evaluateHQLongContentPresentationGate>[0];
  eligibility: HqCircleEligibility;
  visualForm: Parameters<typeof evaluateHQVisualDesignIntentGate>[0];
  responsive?: Parameters<typeof evaluateHQCircularResponsiveGrid>[0];
}): NamedPresentationGate {
  const reasons: string[] = [];
  const geometry = evaluateHQCircularGeometryGate(input.geometry);
  const spacing = evaluateHQCircularContentSpacingGate(input.spacing);
  const longContent = evaluateHQLongContentPresentationGate(input.longContent);
  const intent = evaluateHQVisualDesignIntentGate(input.visualForm);
  if (geometry.result === "FAIL") reasons.push(...geometry.reasons);
  if (spacing.result === "FAIL") reasons.push(...spacing.reasons);
  if (longContent.result === "FAIL") reasons.push(...longContent.reasons);
  if (intent.result === "FAIL") reasons.push(...intent.reasons);
  if (!circularNodeAllowed(input.eligibility) && !input.longContent.value) {
    reasons.push("CIRCULAR_ELIGIBILITY_INVALID");
  }
  if (input.responsive) {
    const responsive = evaluateHQCircularResponsiveGrid(input.responsive);
    if (responsive.result === "FAIL") reasons.push(...responsive.reasons);
  }
  return { gate: HQ_CIRCULAR_RENDERED_QUALITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateAllFirstClassRoomsRenderedQuality(
  roomResults: Array<Parameters<typeof evaluateHQFirstClassRoomRenderedQualityGate>[0]>,
): { omitted: number; failed: string[]; passed: string[] } {
  const registered = hqFirstClassRoomRenderedQCRegistry();
  const tested = new Set(roomResults.map((row) => row.roomId));
  const omitted = registered.filter((id) => !tested.has(id)).length;
  const evaluated = roomResults.map((row) => ({ id: row.roomId, gate: evaluateHQFirstClassRoomRenderedQualityGate(row) }));
  return {
    omitted,
    failed: evaluated.filter((row) => row.gate.result === "FAIL").map((row) => row.id),
    passed: evaluated.filter((row) => row.gate.result === "PASS").map((row) => row.id),
  };
}
