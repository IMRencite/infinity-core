import { OnboardingUnavailableState } from "@/components/dashboard/onboarding-unavailable-state";
import { membershipUnavailableUserMessage } from "@/lib/infinity/operator-console/membership-lookup";

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function WorkspaceUnavailablePage({ searchParams }: Props) {
  const { code } = await searchParams;
  const normalizedCode = code ?? null;

  return (
    <OnboardingUnavailableState
      message={membershipUnavailableUserMessage(normalizedCode)}
      debugCode={
        process.env.NODE_ENV === "development" ? normalizedCode : undefined
      }
    />
  );
}
