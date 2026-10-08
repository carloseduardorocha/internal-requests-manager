import type { ReactNode } from "react";

// The floating bar with the actions for the selected items; the feature
// passes the buttons. Nothing selected hides it.
export function BulkActionBar({
  count,
  busy,
  onClear,
  children,
}: {
  count: number;
  busy: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Ações em massa"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[760px] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border-strong bg-card py-2.5 pr-2.5 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
    >
      <span aria-live="polite" className="font-heading font-extrabold">
        {count === 1 ? "1 selecionada" : `${count} selecionadas`}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="min-h-11 cursor-pointer rounded-lg px-1 font-bold text-primary outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
      >
        Limpar seleção
      </button>
      <div className="flex w-full gap-2 min-[600px]:ml-auto min-[600px]:w-auto [&>*]:flex-1 min-[600px]:[&>*]:flex-none">
        {children}
      </div>
    </div>
  );
}
