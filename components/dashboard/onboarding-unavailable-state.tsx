type Props = {
  message: string;
  debugCode?: string | null;
};

export function OnboardingUnavailableState({ message, debugCode }: Props) {
  return (
    <div className="mx-auto w-full max-w-md">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-white sm:text-[2rem]">
          Workspace unavailable
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          Your account is signed in, but Infinity could not verify organization
          membership right now.
        </p>
      </header>

      <div
        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100/90"
        role="alert"
      >
        <p>{message}</p>
        {debugCode ? (
          <p className="mt-2 text-xs text-amber-200/70">Reference: {debugCode}</p>
        ) : null}
      </div>
    </div>
  );
}
