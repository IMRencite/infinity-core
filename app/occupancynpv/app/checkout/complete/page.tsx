"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OccupancynpvCheckoutCompleteInner() {
  const params = useSearchParams();
  const spoof = params.get("checkout") === "success";

  return (
    <main className="onpv-page onpv-page--checkout mx-auto max-w-lg py-10">
      <h1 className="text-2xl font-semibold">Checkout return</h1>
      <p className="mt-3 text-sm">
        Returning from checkout does not grant access by itself.
        {spoof ? " The checkout=success query parameter is not proof of payment." : ""}
        Sign in to open your dashboard after payment is verified.
      </p>
      <p className="mt-4"><a className="onpv-btn-primary" data-semantic-role="PRIMARY_CONTINUATION" data-app-action="checkout-sign-in" href="/occupancynpv/app/login">Sign in to continue</a></p>
      <p className="mt-6 text-sm">Support: infinitemediaresources@gmail.com</p>
    </main>
  );
}

export default function OccupancynpvCheckoutCompletePage() {
  return (
    <Suspense fallback={<main className="onpv-page onpv-page--checkout py-10">Loading…</main>}>
      <OccupancynpvCheckoutCompleteInner />
    </Suspense>
  );
}
