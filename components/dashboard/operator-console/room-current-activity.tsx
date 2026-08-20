import type { RoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";

type Props = {
  explanation: RoomActivityExplanation;
  className?: string;
};

export function RoomCurrentActivity({ explanation, className = "" }: Props) {
  return (
    <div className={`hq-room-now-block min-w-0 ${className}`.trim()} data-hq-room-now>
      <p className="hq-room-now-label">{explanation.label}</p>
      <p className="hq-room-now">{explanation.sentence}</p>
    </div>
  );
}
