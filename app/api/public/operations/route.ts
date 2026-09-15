import { NextResponse } from "next/server";
import {
  PUBLIC_OPERATIONS_SURFACE,
  PUBLIC_PROJECTION_CACHE_TTL_MS,
  evaluatePublicProjectionReadOnlyGate,
  projectPublicOperations,
} from "@/lib/infinity/public-operations-projection";

const CACHE_CONTROL = `public, max-age=${Math.floor(PUBLIC_PROJECTION_CACHE_TTL_MS / 1000)}, s-maxage=${Math.floor(PUBLIC_PROJECTION_CACHE_TTL_MS / 1000)}`;

function readOnlyDenied(): NextResponse {
  const gate = evaluatePublicProjectionReadOnlyGate({
    allowedMethods: [...PUBLIC_OPERATIONS_SURFACE.methods],
    mutationCapable: PUBLIC_OPERATIONS_SURFACE.mutationCapable,
    createMission: PUBLIC_OPERATIONS_SURFACE.createMission,
    triggerTick: PUBLIC_OPERATIONS_SURFACE.triggerTick,
    sendOutreach: PUBLIC_OPERATIONS_SURFACE.sendOutreach,
    deploy: PUBLIC_OPERATIONS_SURFACE.deploy,
    mutateFinance: PUBLIC_OPERATIONS_SURFACE.mutateFinance,
    mutateProvider: PUBLIC_OPERATIONS_SURFACE.mutateProvider,
  });
  return NextResponse.json(
    {
      contract: "PublicOperationsProjection",
      system_status: "TEMPORARILY_UNAVAILABLE",
      public_activity_summary: "UPDATING",
      error: "method_not_allowed",
      gate: gate.result,
    },
    { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } },
  );
}

export async function GET(): Promise<NextResponse> {
  const projection = projectPublicOperations({ useCache: true });
  return NextResponse.json(projection, {
    status: 200,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Robots-Tag": "index, follow",
    },
  });
}

export async function POST(): Promise<NextResponse> {
  return readOnlyDenied();
}

export async function PUT(): Promise<NextResponse> {
  return readOnlyDenied();
}

export async function PATCH(): Promise<NextResponse> {
  return readOnlyDenied();
}

export async function DELETE(): Promise<NextResponse> {
  return readOnlyDenied();
}
