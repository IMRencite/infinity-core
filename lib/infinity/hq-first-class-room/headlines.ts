import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HQFirstClassRoomHeadlines } from "./contract";

export const DEPARTMENT_HEADLINES: Record<DepartmentId, HQFirstClassRoomHeadlines> = {
  opportunity_lab: {
    active: "Scanning for promising venture ideas",
    idle: "Standing by to scan",
    complete: "Opportunity signals reviewed",
    blocked: "Scan paused",
    failed: "Scan failed",
  },
  research_department: {
    active: "Studying the market and validating demand",
    idle: "Research grid standing by",
    complete: "Market evidence gathered",
    blocked: "Research blocked",
    failed: "Research run failed",
  },
  strategy_finance: {
    active: "Defining the revenue strategy",
    idle: "Profit lab ready",
    complete: "Revenue strategy defined",
    blocked: "Economics blocked or authorization required",
    failed: "Strategy planning failed",
  },
  company_operations: {
    active: "Structuring the venture",
    idle: "Blueprint lab ready",
    complete: "Venture structure ready",
    blocked: "Formation blocked",
    failed: "Structure build failed",
  },
  systems_architect: {
    active: "Mapping required operating systems",
    idle: "Systems architect ready",
    complete: "Operating blueprint mapped",
    blocked: "Systems mapping blocked",
    failed: "Systems mapping failed",
  },
  growth_department: {
    active: "Planning how the venture gets discovered",
    idle: "Growth nexus ready",
    complete: "Growth plan prepared",
    blocked: "Growth planning blocked",
    failed: "Growth planning failed",
  },
  creative_studio: {
    active: "Creating visual direction",
    idle: "Design core ready",
    complete: "Visual assets ready",
    blocked: "Media generation blocked",
    failed: "Media generation failed",
  },
  product_lab: {
    active: "Building the first working version",
    idle: "Creation lab ready",
    complete: "Product build complete",
    blocked: "Product build blocked",
    failed: "Product build failed",
  },
  quality_control: {
    active: "Checking what is ready",
    idle: "Validation station ready",
    complete: "Quality pass complete",
    blocked: "Quality review blocked",
    failed: "Quality review failed",
  },
  launch_operations: {
    active: "Preparing the launch",
    idle: "Deployment depot ready",
    complete: "Launch action completed",
    blocked: "Launch blocked",
    failed: "Launch action failed",
  },
  intelligence_center: {
    active: "Reviewing results and performance",
    idle: "Signal intelligence ready",
    complete: "Performance reviewed",
    blocked: "Performance review blocked",
    failed: "Performance review failed",
  },
  prospect_intelligence: {
    active: "Updating shared prospect intelligence",
    idle: "Prospect intelligence present and ready",
    complete: "Prospect graph refreshed",
    blocked: "Prospect processing blocked",
    failed: "Prospect intelligence run failed",
  },
  executive_office: {
    active: "Choosing what happens next",
    idle: "Command standing by",
    complete: "Decision recorded",
    blocked: "Decision blocked",
    failed: "Decision failed",
  },
  sales_floor: {
    active: "Advancing qualified pipeline",
    idle: "Sales floor present and monitoring",
    complete: "Sales motion reviewed",
    blocked: "Sales motion blocked by evidence or compliance",
    failed: "Sales observation failed",
  },
  operations: {
    active: "Reporting current operating state",
    idle: "Operations standing by",
    complete: "Operating state reported",
    blocked: "Operating state blocked",
    failed: "Operating observation failed",
  },
};

export function requiredDepartmentHeadlines(departmentId: DepartmentId): HQFirstClassRoomHeadlines {
  const headlines = DEPARTMENT_HEADLINES[departmentId];
  if (
    !headlines
    || !headlines.active
    || !headlines.idle
    || !headlines.complete
    || !headlines.blocked
    || !headlines.failed
  ) {
    throw new Error(`HQ_ROOM_METADATA_INVALID: missing headlines for ${departmentId}`);
  }
  return headlines;
}
