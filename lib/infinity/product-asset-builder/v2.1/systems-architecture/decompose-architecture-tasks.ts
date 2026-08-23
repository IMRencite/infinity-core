import { randomUUID } from "node:crypto";
import type { SystemFamily } from "@/lib/infinity/venture-systems-architecture/constants";
import type { CodingTask } from "../types";
import type { CodingTaskType } from "../constants";
import { paymentArchitectureKind } from "./bind-contract";
import type { ArchitectureCodingTaskContext, VentureSystemsBuildCoveragePlan } from "./types";

const TASK_TYPE_FOR_FAMILY: Partial<Record<SystemFamily, CodingTaskType>> = {
  IDENTITY_AND_ACCOUNTS: "IMPLEMENT_FEATURE",
  AUTHORIZATION_AND_ROLES: "IMPLEMENT_FEATURE",
  ENTITLEMENTS: "IMPLEMENT_FEATURE",
  PAYMENTS: "IMPLEMENT_API",
  LEAD_CAPTURE: "IMPLEMENT_UI",
  CRM: "IMPLEMENT_DATABASE",
  SCHEDULING: "IMPLEMENT_FEATURE",
  ANALYTICS: "IMPLEMENT_FEATURE",
  ATTRIBUTION: "IMPLEMENT_FEATURE",
  EXPERIMENTATION: "IMPLEMENT_FEATURE",
  CONTENT_AND_DISTRIBUTION: "IMPLEMENT_UI",
  SEO: "IMPLEMENT_UI",
  CUSTOMER_SUPPORT: "IMPLEMENT_FEATURE",
  CUSTOMER_SUCCESS: "IMPLEMENT_FEATURE",
  REPUTATION_AND_REVIEWS: "IMPLEMENT_FEATURE",
  COMMERCE_AND_FULFILLMENT: "IMPLEMENT_FEATURE",
  LEGAL_AND_COMPLIANCE: "IMPLEMENT_FEATURE",
  SECURITY_AND_RISK: "SECURITY_FIX",
  LIFECYCLE_AUTOMATION: "IMPLEMENT_FEATURE",
  OPERATIONS: "IMPLEMENT_FEATURE",
};

function taskTypeForFamily(family: SystemFamily): CodingTaskType {
  return TASK_TYPE_FOR_FAMILY[family] ?? "IMPLEMENT_FEATURE";
}

export function architectureContextFromPlan(
  plan: VentureSystemsBuildCoveragePlan,
  family: SystemFamily,
): ArchitectureCodingTaskContext {
  const row = plan.rows.find((item) => item.family === family);
  const { input } = plan;
  return {
    ventureId: input.ventureId,
    companyId: input.companyId,
    missionId: input.missionId,
    buildContractId: input.buildContractId,
    ventureSystemsBuildContractId: input.ventureSystemsBuildContractId,
    systemFamily: family,
    requiredCapabilities: row?.requiredCapabilities ?? [],
    architectureConstraints: [
      "Do not invent missing business systems.",
      "Do not purchase or select a commercial provider.",
      "Do not grant live write, Treasury, or EAG authority.",
      `Tenancy remains ${row?.tenancyRequirement ?? input.contract.providerTenancy}.`,
    ],
    tenancyRequirement: row?.tenancyRequirement ?? input.contract.providerTenancy,
    paymentArchitectureKind: paymentArchitectureKind(input.contract),
    acceptanceCriteria: (row?.requiredCapabilities ?? []).map((capability) => `Preserve architecture capability ${capability}`),
  };
}

export function decomposeArchitectureBuildTasks(
  plan: VentureSystemsBuildCoveragePlan,
): Array<
  Omit<CodingTask, "buildRunId" | "status" | "repositoryContext"> & {
    architectureContext: ArchitectureCodingTaskContext;
  }
> {
  const { input } = plan;
  return plan.rows
    .filter((row) => row.required && row.disposition === "INTERNAL_BUILD" && row.authorizedForImplementation)
    .map((row) => {
      const architectureContext = architectureContextFromPlan(plan, row.family);
      return {
        id: randomUUID(),
        ventureId: input.ventureId,
        companyId: input.companyId,
        missionId: input.missionId,
        buildContractId: input.buildContractId,
        ventureSystemsBuildContractId: input.ventureSystemsBuildContractId,
        architectureFamily: row.family,
        architectureRequirementIds: [row.family],
        coverageDisposition: row.disposition,
        architectureContext,
        featureContractIds: [],
        objective: `Implement ${row.family} from the Venture Systems Build Contract without inventing provider purchases or deferred systems.`,
        taskType: taskTypeForFamily(row.family),
        complexity: row.family === "PAYMENTS" || row.family === "IDENTITY_AND_ACCOUNTS" ? "high" : "medium",
        relevantFiles: [],
        allowedPaths: ["app", "lib", "components"],
        forbiddenPaths: [".env", ".env.local", "node_modules"],
        requirements: [
          ...row.requiredCapabilities.map((capability) => `Capability ${capability}`),
          `Tenancy ${row.tenancyRequirement}`,
          "Provider-neutral implementation; do not hard-code HubSpot, Twilio, Resend, or GA4 as required vendors.",
        ],
        acceptanceCriteria: architectureContext.acceptanceCriteria,
        dependencies: [],
        preferredCapabilities: ["coding", "structured_output"],
        maxFilesChanged: 8,
        retryLimit: 2,
      };
    });
}
