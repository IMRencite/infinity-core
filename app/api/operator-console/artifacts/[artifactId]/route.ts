import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadVentureSnapshotForHq } from "@/lib/infinity/operator-console/load-venture-snapshot-for-hq";
import {
  buildArtifactInspectorModel,
  flattenRoomArtifacts,
} from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { loadArtifactDetailPayload } from "@/lib/infinity/operator-console/artifacts/load-artifact-detail";

type RouteContext = { params: Promise<{ artifactId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const orgContext = await getOperatorOrgContext();
  if (!orgContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { artifactId } = await context.params;
  const url = new URL(request.url);
  const ventureId = url.searchParams.get("ventureId");

  if (!artifactId || artifactId.length < 4) {
    return NextResponse.json({ error: "Invalid artifact ID" }, { status: 400 });
  }
  if (!ventureId) {
    return NextResponse.json({ error: "ventureId query parameter required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const snapshot = await loadVentureSnapshotForHq(admin, orgContext.organizationId, ventureId);
    if (!snapshot) {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    }

    const allArtifacts = flattenRoomArtifacts(snapshot.roomArtifacts, snapshot.departments);
    const artifact = allArtifacts.find((a) => a.id === artifactId);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found in venture snapshot" }, { status: 404 });
    }

    const detail = await loadArtifactDetailPayload(admin, orgContext.organizationId, artifact);
    const model = buildArtifactInspectorModel(artifact, allArtifacts, detail);

    return NextResponse.json(
      { model, detail },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load artifact detail" }, { status: 500 });
  }
}
