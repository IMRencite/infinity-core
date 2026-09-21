import { unknownMetricDisplay } from "@/lib/infinity/venture-sales-floor/intelligence";
import type { SalesRoomId } from "@/lib/infinity/venture-sales-floor/contract";
import type { SalesExecutionSnapshot } from "./types";

export type SalesPerformanceView = {
  qualified_prospects: string;
  send_attempts: string;
  delivered: string;
  replies: string;
  positive_replies: string;
  opportunities: string;
  trial_starts: string;
  closed_wins: string;
  sales_attributed_revenue: "UNKNOWN";
};

export function projectSalesPerformanceView(snapshot: SalesExecutionSnapshot): SalesPerformanceView {
  return {
    qualified_prospects: unknownMetricDisplay(snapshot.qualified_prospects),
    send_attempts: unknownMetricDisplay(snapshot.attempted),
    delivered: unknownMetricDisplay(snapshot.delivered),
    replies: unknownMetricDisplay(snapshot.replies),
    positive_replies: unknownMetricDisplay(snapshot.positive_replies),
    opportunities: unknownMetricDisplay(snapshot.opportunities),
    trial_starts: unknownMetricDisplay(snapshot.trial_starts),
    closed_wins: unknownMetricDisplay(snapshot.purchases),
    sales_attributed_revenue: "UNKNOWN",
  };
}

export function salesRoomExactWork(room: SalesRoomId, sending: boolean): string {
  if (room === "OUTBOUND_ACQUISITION") {
    return sending
      ? "Sending the first qualified OccupancyNPV outreach sequence."
      : "Qualifying the next OccupancyNPV tenant-rep prospect batch.";
  }
  if (room === "INBOUND_CONVERSION") {
    return "Monitoring OccupancyNPV trial starts, demo requests, and inbound sales questions.";
  }
  if (room === "EXPANSION_RETENTION") {
    return "Waiting for OccupancyNPV customer evidence before retention or expansion work.";
  }
  if (room === "PARTNERSHIPS_CHANNEL") {
    return "Building the OccupancyNPV affiliate-program capability without recruitment outreach.";
  }
  return "Preparing to take ownership when a qualified OccupancyNPV prospect reaches commercial intent.";
}
