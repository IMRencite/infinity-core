"use client";

import { useEffect, useRef, useState } from "react";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { groupArtifactsForDisplay } from "@/lib/infinity/operator-console/artifacts/grouping";
import { ArtifactCompletenessNote, ArtifactStack } from "./primitives";
import { useOptionalHqArtifactInspector } from "./hq-artifact-inspector-provider";

type Props = {
  artifacts: HqWorkArtifact[];
  expectedCount?: number | null;
  roomName?: string;
  isActive?: boolean;
  isTerminal?: boolean;
  compact?: boolean;
};

function useNarrowHqViewport(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return narrow;
}

export function RoomArtifactRail({
  artifacts,
  expectedCount = null,
  roomName,
  isActive = false,
  isTerminal = false,
}: Props) {
  const inspector = useOptionalHqArtifactInspector();
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isNarrow = useNarrowHqViewport();
  const grouped = groupArtifactsForDisplay(artifacts, Number.POSITIVE_INFINITY, expectedCount);

  const syncScrollState = () => {
    if (!isNarrow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const el = railRef.current?.querySelector<HTMLElement>(".hq-artifact-grid");
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    if (!isNarrow) return;
    const el = railRef.current?.querySelector<HTMLElement>(".hq-artifact-grid");
    if (!el) return;
    const onScroll = () => syncScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    syncScrollState();
    const ro = new ResizeObserver(() => syncScrollState());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [grouped.visible.length, isNarrow]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = railRef.current?.querySelector<HTMLElement>(".hq-artifact-grid");
    if (!el) return;
    el.scrollBy({ left: direction * 196, behavior: "smooth" });
  };

  if (artifacts.length === 0) return null;

  const openInventory = () => {
    inspector?.openRoomInventory({
      roomName: roomName ?? "Room outputs",
      artifacts,
    });
  };

  return (
    <div
      ref={railRef}
      className={`hq-room-artifact-platform hq-room-artifact-grid-wrap relative mt-2 min-w-0 w-full px-2.5 py-2 ${
        artifacts.length > 0 ? "hq-room-artifact-platform--populated" : ""
      } ${isTerminal ? "" : isActive ? "hq-room-artifact-active" : ""}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {grouped.artifactLoaded} output{grouped.artifactLoaded === 1 ? "" : "s"}
        </p>
        {grouped.artifactLoaded > 1 ? (
          <button
            type="button"
            className="hq-artifact-view-all text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90 hover:text-cyan-100"
            aria-label={`View all ${grouped.artifactLoaded} room outputs`}
            onClick={(event) => {
              event.stopPropagation();
              openInventory();
            }}
          >
            View all {grouped.artifactLoaded}
          </button>
        ) : null}
      </div>

      <div className="relative min-w-0">
        {isNarrow && (canScrollLeft || canScrollRight) ? (
          <>
            {canScrollLeft ? <span className="hq-artifact-rail-fade hq-artifact-rail-fade--left" aria-hidden /> : null}
            {canScrollRight ? <span className="hq-artifact-rail-fade hq-artifact-rail-fade--right" aria-hidden /> : null}
            <button
              type="button"
              className="hq-artifact-rail-arrow hq-artifact-rail-arrow--left"
              aria-label="Scroll artifacts left"
              disabled={!canScrollLeft}
              onClick={(event) => {
                event.stopPropagation();
                scrollByCard(-1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="hq-artifact-rail-arrow hq-artifact-rail-arrow--right"
              aria-label="Scroll artifacts right"
              disabled={!canScrollRight}
              onClick={(event) => {
                event.stopPropagation();
                scrollByCard(1);
              }}
            >
              ›
            </button>
          </>
        ) : null}
        <ArtifactStack
          artifacts={grouped.visible}
          overflowCount={0}
          isActive={isActive && !isTerminal}
          onExpandOverflow={openInventory}
        />
      </div>
      <ArtifactCompletenessNote loaded={grouped.artifactLoaded} expected={grouped.expectedCount} />
    </div>
  );
}

export function RoomArtifactSurface(props: Props) {
  return <RoomArtifactRail {...props} />;
}

export function RoomArtifactGrid(props: Props) {
  return <RoomArtifactRail {...props} />;
}
