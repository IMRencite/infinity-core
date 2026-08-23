"use client";

import type { RoomWorkZoneConfig } from "@/lib/infinity/operator-console/room-work-zones";

type Props = {
  motif: RoomWorkZoneConfig["motif"];
  active: boolean;
};

export function RoomMotif({ motif, active }: Props) {
  const opacity = active ? "opacity-50" : "opacity-15";
  const stroke = active ? "stroke-sky-400/30" : "stroke-zinc-700/40";

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${opacity}`}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      {motif === "radar" ? (
        <>
          <path d="M 50 35 L 50 8" className={stroke} strokeWidth="0.4" fill="none" />
          <path d="M 20 35 A 30 30 0 0 1 80 35" className={`${stroke} ${active ? "hq-radar-sweep" : ""}`} strokeWidth="0.5" fill="none" />
        </>
      ) : null}
      {motif === "network" ? (
        <>
          <circle cx="20" cy="10" r="1.5" className="fill-zinc-600" />
          <circle cx="35" cy="8" r="1.5" className="fill-zinc-600" />
          <circle cx="50" cy="12" r="1.5" className="fill-zinc-600" />
          <path d="M 20 10 L 50 22 L 80 30" className={stroke} strokeWidth="0.35" fill="none" />
        </>
      ) : null}
      {motif === "economics" ? (
        <path d="M 10 30 L 30 18 L 50 24 L 70 12 L 90 20" className={stroke} strokeWidth="0.45" fill="none" />
      ) : null}
      {motif === "blueprint" ? (
        <>
          <rect x="15" y="8" width="70" height="24" className={stroke} strokeWidth="0.35" fill="none" />
          <path d="M 15 18 L 85 18 M 40 8 L 40 32" className={stroke} strokeWidth="0.25" fill="none" />
        </>
      ) : null}
      {motif === "systems" ? (
        <>
          <rect x="8" y="14" width="14" height="12" className={stroke} strokeWidth="0.35" fill="none" />
          <rect x="32" y="12" width="14" height="16" className={stroke} strokeWidth="0.35" fill="none" />
          <rect x="56" y="14" width="14" height="12" className={stroke} strokeWidth="0.35" fill="none" />
          <rect x="80" y="16" width="12" height="8" className={stroke} strokeWidth="0.35" fill="none" />
          <path d="M 22 20 L 32 20 M 46 20 L 56 20 M 70 20 L 80 20" className={stroke} strokeWidth="0.35" fill="none" />
        </>
      ) : null}
      {motif === "branch" ? (
        <path d="M 50 32 L 50 20 M 50 20 L 25 10 M 50 20 L 75 10" className={stroke} strokeWidth="0.4" fill="none" />
      ) : null}
      {motif === "frame" ? (
        <rect x="30" y="8" width="40" height="24" className={`${stroke} ${active ? "hq-frame-glow" : ""}`} strokeWidth="0.5" fill="none" rx="1" />
      ) : null}
      {motif === "pipeline" ? (
        <>
          <rect x="12" y="14" width="12" height="12" className={stroke} strokeWidth="0.35" fill="none" />
          <rect x="44" y="12" width="12" height="16" className={stroke} strokeWidth="0.35" fill="none" />
          <rect x="76" y="14" width="12" height="12" className={stroke} strokeWidth="0.35" fill="none" />
          <path d="M 24 20 L 44 20 M 56 20 L 76 20" className={stroke} strokeWidth="0.35" fill="none" />
        </>
      ) : null}
      {motif === "checkpoint" ? (
        <>
          <path d="M 15 20 L 85 20" className={stroke} strokeWidth="0.5" fill="none" strokeDasharray="2 2" />
          <rect x="44" y="12" width="12" height="16" className={stroke} strokeWidth="0.4" fill="none" />
        </>
      ) : null}
      {motif === "launch" ? (
        <path d="M 50 32 L 50 8 M 42 16 L 50 8 L 58 16" className={stroke} strokeWidth="0.45" fill="none" />
      ) : null}
      {motif === "metrics" ? (
        <>
          <path d="M 15 28 L 15 12 M 15 12 L 85 12" className={stroke} strokeWidth="0.35" fill="none" />
          <path d="M 20 24 L 35 18 L 50 22 L 65 14 L 80 20" className={`${stroke} ${active ? "hq-metrics-pulse" : ""}`} strokeWidth="0.45" fill="none" />
        </>
      ) : null}
      {motif === "command" ? (
        <circle cx="50" cy="20" r="8" className={stroke} strokeWidth="0.4" fill="none" />
      ) : null}
    </svg>
  );
}
