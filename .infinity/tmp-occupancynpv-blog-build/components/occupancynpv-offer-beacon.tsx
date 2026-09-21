"use client";
import { useEffect } from "react";

function emit(event: string) {
  void fetch("/api/occupancynpv/offer-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, offer_id: "offer:candidate:7e7e924e-0741-4155-a729-8d529da77ea9:paid-first-rendered-v2", source: "pricing" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function OccupancynpvOfferBeacon() {
  useEffect(() => {
    emit("offer_view");
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const cta = target?.closest("[data-offer-cta]");
      if (!cta) return;
      emit("offer_cta_click");
      emit("offer_start");
      emit("checkout_start");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
