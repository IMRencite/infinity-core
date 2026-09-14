import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { startHqCanonicalDiskWatch } from "@/lib/infinity/operator-console/hq-canonical-watch";
import { HQ_SSE_HEARTBEAT_MS } from "@/lib/infinity/operator-console/hq-live-policy";
import { subscribeHqRuntimeEvents, type HqRuntimeEvent } from "@/lib/infinity/operator-console/hq-live-events";
import {
  isLocalHqObservabilityProofRequest,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSse(event: HqRuntimeEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: Request): Promise<Response> {
  const result = await getOperatorOrgContext();
  if (result.status === "error") {
    return new Response(JSON.stringify({ error: "Workspace unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const organizationId =
    result.status === "ok"
      ? result.context.organizationId
      : isLocalHqObservabilityProofRequest(request)
        ? localHqProofOrganizationId()
        : null;
  if (!organizationId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  startHqCanonicalDiskWatch();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: HqRuntimeEvent) => {
        try {
          controller.enqueue(encodeSse(event));
        } catch {
          // Client gone.
        }
      };
      send({
        type: "HQ_SNAPSHOT_INVALIDATED",
        at: new Date().toISOString(),
        reason: "SUBSCRIBE",
      });
      const unsub = subscribeHqRuntimeEvents(send);
      const heartbeat = setInterval(() => {
        send({ type: "HEARTBEAT", at: new Date().toISOString() });
      }, HQ_SSE_HEARTBEAT_MS);
      if (typeof heartbeat.unref === "function") heartbeat.unref();
      const close = () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", close);
      if (request.signal.aborted) close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
