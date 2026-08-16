"use client";

type Props = { value: string; label?: string };

export function CopyIdButton({ value, label = "Copy" }: Props) {
  return (
    <button
      type="button"
      className="rounded border border-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
      onClick={() => navigator.clipboard.writeText(value)}
    >
      {label}
    </button>
  );
}
