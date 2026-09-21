"use client";
import { useEffect } from "react";
import { emitExperimentEvent } from "./ingest-client";

export function ViewBeacon() {
  useEffect(() => {
    void emitExperimentEvent("PAGE_VIEW");
  }, []);
  return null;
}
