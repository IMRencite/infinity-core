import { InfinityOsHero, HqFoldSkeleton } from "@/components/dashboard/operator-console/infinity-os-hero";

export default function DashboardLoading() {
  return (
    <div className="infinity-hq space-y-3 overflow-x-hidden text-zinc-200">
      <InfinityOsHero />
      <HqFoldSkeleton />
    </div>
  );
}
