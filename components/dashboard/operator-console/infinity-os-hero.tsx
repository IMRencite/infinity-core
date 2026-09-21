import type { ReactNode } from "react";
import { HQ_WELCOME_SUBTITLE, HQ_WELCOME_TITLE } from "@/lib/infinity/operator-console/room-naming";

type HeroProps = {
  controls?: ReactNode;
  children?: ReactNode;
};

export function InfinityOsHero({ controls, children }: HeroProps) {
  return (
    <header className="hq-os-command-header infinity-holographic-surface" data-hq-shell="global">
      {controls ? (
        <div className="hq-os-global-controls" data-hq-region="global-controls">
          {controls}
        </div>
      ) : null}
      <div data-hq-region="welcome" className="hq-os-hero">
        <div className="hq-os-hero-glow" aria-hidden />
        <div className="hq-os-hero-beam" aria-hidden />
        <h1 className="hq-os-hero-title">{HQ_WELCOME_TITLE}</h1>
        <p className="hq-os-hero-subtitle">{HQ_WELCOME_SUBTITLE}</p>
      </div>
      {children ? (
        <div data-hq-region="ask-infinity" className="hq-os-ask">
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function HqFoldSkeleton({
  label = "Loading venture intelligence",
}: {
  label?: string;
}) {
  return (
    <div
      className="hq-fold-skeleton"
      data-hq-fold-skeleton="true"
      data-hq-region="venture-stack"
      aria-busy="true"
      aria-label={label}
    >
      <div className="hq-fold-skeleton-block" />
      <div className="hq-fold-skeleton-block hq-fold-skeleton-block--tall" />
    </div>
  );
}
