import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";
import {
  evaluatePublicLaunchMessagingConsistencyGate,
  occupancynpvCurrentLifecycleContentState,
  persistOccupancynpvLaunchMessagingEvidence,
  readLifecycleContentRevalidationEvidence,
  requiredLifecycleContentTransitions,
  routeFromOccupancynpvPagePath,
} from "./public-launch-messaging-consistency-gate";

export function composedOccupancynpvPublicMessagingPages() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  return composed.files
    .filter((file) => {
      const path = file.path.replace(/\\/g, "/");
      return path.endsWith("page.tsx") && path.startsWith("app/") && !path.startsWith("app/occupancynpv/") && !path.startsWith("app/api/");
    })
    .map((file) => ({
      route: routeFromOccupancynpvPagePath(file.path),
      html: file.content,
    }));
}

export function evaluateOccupancynpvComposedLifecycleMessaging() {
  const pages = composedOccupancynpvPublicMessagingPages();
  const lifecycle = occupancynpvCurrentLifecycleContentState();
  const revalidation = readLifecycleContentRevalidationEvidence();
  const consistency = evaluatePublicLaunchMessagingConsistencyGate({
    lifecycle,
    pages,
    revalidation,
  });
  const blocking = consistency.findings.filter((row) => row.classification === "LAUNCH_BLOCKING_CONTRADICTION");
  const affectedRoutes = [...new Set(blocking.map((row) => row.route))];
  return {
    routesScanned: pages.length,
    additionalLifecycleContradictions: blocking.length,
    affectedRoutes,
    remainingContradictions: blocking.length,
    findings: blocking,
    consistency,
    requiredTransitions: requiredLifecycleContentTransitions(lifecycle),
  };
}

export function persistOccupancynpvComposedLaunchMessagingEvidence() {
  return persistOccupancynpvLaunchMessagingEvidence({
    capturedAt: new Date().toISOString(),
    pages: composedOccupancynpvPublicMessagingPages(),
  });
}
