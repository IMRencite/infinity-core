"use client";

type Props = {
  label?: string;
  value: string | null | undefined;
  muted?: boolean;
};

export function RoomOutputStrip({ label = "Output", value, muted = false }: Props) {
  if (!value) return null;

  return (
    <p className={`hq-room-output-strip mt-2 truncate ${muted ? "opacity-80" : ""}`}>
      <span className="hq-room-output-label">{label}</span>
      {value}
    </p>
  );
}
