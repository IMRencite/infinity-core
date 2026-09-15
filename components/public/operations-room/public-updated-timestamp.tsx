import { formatPublicTimestamp } from "@/lib/infinity/public-operations-room/format";

export function PublicUpdatedTimestamp({ generatedAt }: { generatedAt: string }) {
  return <time dateTime={generatedAt}>{formatPublicTimestamp(generatedAt)}</time>;
}
