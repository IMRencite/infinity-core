import { HqMotionHarnessPageClient } from "@/components/dashboard/operator-console/hq-motion-harness-page-client";

export default function HqMotionHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-3xl p-8 text-zinc-300">
        <h1 className="text-lg font-medium text-white">HQ motion harness unavailable</h1>
        <p className="mt-2 text-sm">This development preview is disabled in production builds.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-8">
      <h1 className="text-lg font-medium text-white">HQ Motion Harness</h1>
      <HqMotionHarnessPageClient />
    </main>
  );
}
